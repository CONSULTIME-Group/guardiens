-- Lot ADM13 · Une fonction, une liste (lot 2 du plan de l'arène admin du
-- 09/11/2026, école « Une seule liste », « ok go » de Jérémie).
--
-- Constat (claude/arene/2026-11-09-admin-pastilles/, lot A N1, V1, V6, V7) :
-- la vue d'ensemble et l'email du matin fabriquaient chacun leur liste à partir
-- de lectures différentes (signaux, annonces, files humaines, état du site,
-- relances), avec des règles différentes : 7 lignes à l'écran, d'autres dans
-- l'email. « Candidatures sans réponse » valait 19 dans une tuile et 15 deux
-- centimètres plus bas, et deux « mentions de tarif » ne citaient aucun tarif.
--
-- 1. admin_work_list : une seule lecture, toutes les sources de la liste de
--    travail, avec l'état de chaque source (une source en échec se dit
--    « indisponible », jamais 0). La mise en forme (une ligne par élément,
--    phrase avec verbe, lien, date d'attente) est faite par
--    supabase/functions/_shared/admin-work-list.ts, seul module lu par la vue
--    d'ensemble et par l'email du matin : les libellés et la nature de chaque
--    type de signal vivent dans _shared/admin-signal-config.ts, une seule fois.
-- 2. admin_liquidity_snapshot : « candidatures sans réponse » = en attente,
--    vues ou en discussion, annonce encore publiée, garde non commencée
--    (décision 2 de l'arène).
-- 3. looks_like_pricing : un tarif = un montant avec sa monnaie ; les mots
--    seuls (« par jour », « tarifs ») ne suffisent plus ; les signaux ouverts
--    qui ne citent aucun montant sont fermés.
-- Rejouable.

-- 1. Sources de la liste de travail, en une lecture.
CREATE OR REPLACE FUNCTION public.admin_work_list()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_signals jsonb := '[]'::jsonb;
  v_sits jsonb := '[]'::jsonb;
  v_queues jsonb := '[]'::jsonb;
  v_health jsonb := '[]'::jsonb;
  v_relances integer := 0;
  ok_signals boolean := true;
  ok_sits boolean := true;
  ok_queues boolean := true;
  ok_relances boolean := true;
  ok_health boolean := true;
  v_errors jsonb := '{}'::jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR coalesce(auth.jwt()->>'role', '') = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Signaux ouverts. Une annonce sans candidature reste lue même sans gardien
  -- dans le rayon (sévérité info, lot ADM12).
  BEGIN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id', s.id, 'signal_type', s.signal_type, 'severity', s.severity,
             'entity_type', s.entity_type, 'entity_id', s.entity_id,
             'detected_at', s.detected_at, 'metadata', s.metadata)
             ORDER BY s.detected_at DESC), '[]'::jsonb)
      INTO v_signals
      FROM (
        SELECT * FROM public.admin_signals
         WHERE resolved_at IS NULL
           AND (severity IS DISTINCT FROM 'info' OR signal_type = 'no_applications')
         ORDER BY detected_at DESC
         LIMIT 1000
      ) s;
  EXCEPTION WHEN OTHERS THEN
    ok_signals := false;
    v_errors := v_errors || jsonb_build_object('signals', left(SQLERRM, 200));
    v_signals := '[]'::jsonb;
  END;

  -- Annonces citées par ces signaux (titre, ville, date de départ).
  BEGIN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id', si.id, 'title', si.title, 'city', si.city, 'start_date', si.start_date)), '[]'::jsonb)
      INTO v_sits
      FROM public.sits si
     WHERE si.id IN (
       SELECT CASE
                WHEN (x->'metadata'->>'sit_id') ~ '^[0-9a-f-]{36}$' THEN (x->'metadata'->>'sit_id')::uuid
                WHEN x->>'entity_type' = 'sit' THEN (x->>'entity_id')::uuid
              END
         FROM jsonb_array_elements(v_signals) x);
  EXCEPTION WHEN OTHERS THEN
    ok_sits := false;
    v_errors := v_errors || jsonb_build_object('sits', left(SQLERRM, 200));
    v_sits := '[]'::jsonb;
  END;

  -- Files où un membre attend une réponse humaine (mêmes définitions que le menu).
  BEGIN
    v_queues := coalesce(public.admin_human_queues(), '[]'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    ok_queues := false;
    v_errors := v_errors || jsonb_build_object('queues', left(SQLERRM, 200));
    v_queues := '[]'::jsonb;
  END;

  -- Relances automatiques en échec sur 7 jours. Liste des gabarits égale à
  -- AUTO_RELANCE_TEMPLATES (_shared/admin-signal-config.ts), verrou de test.
  BEGIN
    SELECT count(*)::int INTO v_relances
      FROM public.email_send_log
     WHERE template_name = ANY (ARRAY['owner-pending-application-nudge', 'owner-sit-unconfirmed', 'sit-draft-reminder', 'unread-messages-reminder'])
       AND status IN ('failed', 'bounced')
       AND created_at >= now() - interval '7 days';
  EXCEPTION WHEN OTHERS THEN
    ok_relances := false;
    v_errors := v_errors || jsonb_build_object('relances', left(SQLERRM, 200));
    v_relances := 0;
  END;

  -- Voyants de l'état du site (rouge tant que la cause est présente, lot ADM12).
  BEGIN
    v_health := coalesce(public.admin_site_health(), '[]'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    ok_health := false;
    v_errors := v_errors || jsonb_build_object('health', left(SQLERRM, 200));
    v_health := '[]'::jsonb;
  END;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'sources', jsonb_build_object(
      'signals', ok_signals, 'sits', ok_sits, 'queues', ok_queues,
      'relances', ok_relances, 'health', ok_health),
    'errors', v_errors,
    'signals', v_signals,
    'sits', v_sits,
    'queues', v_queues,
    'relances_failed_7d', v_relances,
    'health', v_health
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_work_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_work_list() TO authenticated, service_role;

-- 2. Candidatures sans réponse : en attente, vues ou en discussion, garde non commencée.
DO $mig$
DECLARE
  d text;
  fixed text;
BEGIN
  SELECT pg_get_functiondef('public.admin_liquidity_snapshot()'::regprocedure) INTO d;
  IF position('adm13_sans_reponse' IN d) = 0 THEN
    fixed := replace(d,
      $q$  WHERE a.status = 'pending' AND s.status = 'published';$q$,
      $q$  WHERE a.status IN ('pending', 'viewed', 'discussing') -- adm13_sans_reponse
    AND s.status = 'published'
    AND (s.start_date IS NULL OR s.start_date::date >= (now() AT TIME ZONE 'Europe/Paris')::date);$q$);
    IF fixed = d THEN
      RAISE EXCEPTION 'admin_liquidity_snapshot : définition des candidatures en attente introuvable';
    END IF;
    EXECUTE fixed;
  END IF;
END
$mig$;

-- 3. Un tarif = un montant avec sa monnaie.
CREATE OR REPLACE FUNCTION public.looks_like_pricing(txt text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  t text;
BEGIN
  IF txt IS NULL OR length(trim(txt)) = 0 THEN
    RETURN false;
  END IF;
  t := lower(unaccent_immutable_safe(txt));
  -- « 20 € », « 15,50 euros », « 30eur »
  IF t ~ '\d+([.,]\d+)?\s*(€|eur(os?)?\y)' THEN
    RETURN true;
  END IF;
  -- « € 20 », « euros 15 »
  IF t ~ '(€|\yeur(os?)?\y)\s*\d+' THEN
    RETURN true;
  END IF;
  -- « 20e par jour », « 15 e/nuit » : montant abrégé suivi d'une unité de prestation
  IF t ~ '\y\d+([.,]\d+)?\s*e\s*(/|par)\s*(jour|nuit|visite|passage|heure|h)\y' THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$function$;

-- Signaux ouverts relus sur le texte entier (l'extrait est coupé à 300 caractères).
UPDATE public.admin_signals s
   SET resolved_at = now(), action_taken = 'auto_resolved_sans_montant'
 WHERE s.resolved_at IS NULL
   AND s.signal_type = 'undeclared_pricing'
   AND NOT public.looks_like_pricing(coalesce(
         CASE WHEN s.entity_type = 'message' THEN (SELECT m.content FROM public.messages m WHERE m.id = s.entity_id) END,
         CASE WHEN s.entity_type = 'application' THEN (SELECT a.message FROM public.applications a WHERE a.id = s.entity_id) END,
         s.metadata->>'excerpt', ''));
