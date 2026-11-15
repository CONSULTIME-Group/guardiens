-- Lots TRF-3 et TRF-4 (15/11/2026, audit claude/audit-2-admin-trafic-collecte-actions-ux-15-novembre-2026.md,
-- « ok go fais tout » de Jérémie). Rejouable. Repères : trf3_retour_membre, trf3_motifs_echec, trf4_collecte.
--
-- TRF-3, justesse :
--  1. admin_channel_leads : l'accès direct d'un membre déjà connecté devient « retour_membre »
--     (328 visites en accès direct le 15/11, membres et nouveaux visiteurs mêlés).
--  2. admin_signup_sources : même cohorte que l'onglet Leads (comptes supprimés et équipe exclus),
--     228 inscrits d'un côté et 241 de l'autre sur la même période le 15/11.
--  3. get_signup_funnel_metrics : le motif d'un échec d'inscription se lit dans error_code
--     (le tableau affichait « Motif inconnu 46 » ; la base porte 27 mots de passe refusés,
--     8 comptes déjà existants, 11 seconds envois dans la minute).
-- TRF-4, collecte :
--  4. seo_gsc_snapshots : relevé hebdomadaire Search Console par page et par requête,
--     écrit par la fonction fetch-seo-data (un seul instantané existait, seo_cache).
--  5. seo_action_log : journal des actions SEO, alimenté par un déclencheur sur les
--     titres et descriptions des articles et par l'admin.

CREATE OR REPLACE FUNCTION public.admin_channel_leads(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_from timestamptz := (p_from::timestamp AT TIME ZONE 'Europe/Paris');
  v_to timestamptz := ((p_to + 1)::timestamp AT TIME ZONE 'Europe/Paris');
  v_rows jsonb;
  v_sits bigint;
BEGIN
  -- Repère : trf2_leads, trf3_retour_membre.
  IF coalesce(auth.role(), '') <> 'service_role'
     AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH first_views AS (
    SELECT DISTINCT ON (e.metadata ->> 'visit_id')
           e.metadata ->> 'visit_id' AS visit_id,
           public.trf2_page_view_source(e.metadata) AS src,
           (e.user_id IS NOT NULL) AS member
    FROM public.analytics_events e
    WHERE e.event_type = 'page_view'
      AND e.created_at >= v_from AND e.created_at < v_to
      AND e.metadata ? 'visit_id'
      AND coalesce(e.metadata ->> 'visit_id', '') <> ''
      AND (e.user_id IS NULL OR NOT public.has_role(e.user_id, 'admin'::public.app_role))
    ORDER BY e.metadata ->> 'visit_id', e.created_at
  ),
  visits AS (
    -- Lot TRF-3 : une visite en accès direct ouverte par un membre déjà
    -- connecté est un retour de membre, lu à part des nouveaux visiteurs.
    SELECT CASE WHEN member AND public.derive_signup_channel(src) = 'direct' THEN 'retour_membre'
                ELSE public.derive_signup_channel(src) END AS channel,
           src ->> 'uc' AS campaign
    FROM first_views
  ),
  cohort AS (
    SELECT pr.id, coalesce(s.channel, 'inconnu') AS channel, s.utm_campaign AS campaign
    FROM public.profiles pr
    LEFT JOIN public.profile_signup_sources s ON s.user_id = pr.id
    WHERE pr.created_at >= v_from AND pr.created_at < v_to
      AND (pr.account_status IS NULL OR pr.account_status::text <> 'deleted')
      AND NOT public.has_role(pr.id, 'admin'::public.app_role)
  ),
  acts AS (
    SELECT c.id, c.channel, c.campaign,
      EXISTS (SELECT 1 FROM public.sits st WHERE st.user_id = c.id AND st.published_at IS NOT NULL) AS published,
      EXISTS (SELECT 1 FROM public.applications a WHERE a.sitter_id = c.id) AS applied,
      (EXISTS (SELECT 1 FROM public.small_missions m WHERE m.user_id = c.id AND m.status <> 'cancelled')
        OR EXISTS (SELECT 1 FROM public.small_mission_responses r WHERE r.responder_id = c.id)) AS helped,
      (EXISTS (SELECT 1 FROM public.outings o WHERE o.organizer_id = c.id AND o.status <> 'cancelled')
        OR EXISTS (SELECT 1 FROM public.outing_attendees t WHERE t.user_id = c.id)) AS outing
    FROM cohort c
  ),
  v_by AS (
    SELECT channel, campaign, grouping(campaign) AS total_row, count(*) AS visits
    FROM visits GROUP BY GROUPING SETS ((channel), (channel, campaign))
  ),
  s_by AS (
    SELECT channel, campaign, grouping(campaign) AS total_row,
      count(*) AS signups,
      count(*) FILTER (WHERE published) AS published_members,
      count(*) FILTER (WHERE applied) AS applicants,
      count(*) FILTER (WHERE helped) AS helpers,
      count(*) FILTER (WHERE outing) AS outing_members
    FROM acts GROUP BY GROUPING SETS ((channel), (channel, campaign))
  ),
  merged AS (
    SELECT coalesce(v.channel, s.channel) AS channel,
           coalesce(v.campaign, s.campaign) AS campaign,
           (coalesce(v.total_row, s.total_row) = 0) AS is_campaign,
           coalesce(v.visits, 0) AS visits,
           coalesce(s.signups, 0) AS signups,
           coalesce(s.published_members, 0) AS published_members,
           coalesce(s.applicants, 0) AS applicants,
           coalesce(s.helpers, 0) AS helpers,
           coalesce(s.outing_members, 0) AS outing_members
    FROM v_by v
    FULL JOIN s_by s
      ON s.channel = v.channel
     AND s.total_row = v.total_row
     AND s.campaign IS NOT DISTINCT FROM v.campaign
  )
  -- Lignes de canal (is_campaign faux) puis lignes de campagne ; une campagne
  -- vide (is_campaign vrai, campaign nul) = arrivées sans campagne.
  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.is_campaign, m.signups DESC, m.visits DESC, m.channel, m.campaign NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM merged m;

  SELECT count(*) INTO v_sits
  FROM public.sits st
  WHERE st.published_at >= v_from AND st.published_at < v_to;

  RETURN jsonb_build_object('sits_published', v_sits, 'rows', v_rows);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_signup_sources(p_from date, p_to date)
 RETURNS TABLE(channel text, signups bigint, owners bigint, sitters bigint, boths bigint, google_accounts bigint, email_accounts bigint, members_with_published_sit bigint, published_sits bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH cohort AS (
    SELECT pr.id,
           pr.role::text AS role,
           coalesce(s.channel, 'inconnu') AS channel,
           coalesce(u.raw_app_meta_data ->> 'provider', 'email') AS provider
    FROM public.profiles pr
    LEFT JOIN public.profile_signup_sources s ON s.user_id = pr.id
    LEFT JOIN auth.users u ON u.id = pr.id
    WHERE pr.created_at >= (p_from::timestamp AT TIME ZONE 'Europe/Paris')
      AND pr.created_at < ((p_to + 1)::timestamp AT TIME ZONE 'Europe/Paris')
      -- Lot TRF-3 : même cohorte que admin_channel_leads.
      AND (pr.account_status IS NULL OR pr.account_status::text <> 'deleted')
      AND NOT public.has_role(pr.id, 'admin'::public.app_role)
  ),
  published AS (
    SELECT st.user_id, count(*) AS n
    FROM public.sits st
    WHERE st.published_at IS NOT NULL
      AND st.user_id IN (SELECT c.id FROM cohort c)
    GROUP BY st.user_id
  )
  SELECT c.channel,
         count(*)::bigint,
         count(*) FILTER (WHERE c.role = 'owner')::bigint,
         count(*) FILTER (WHERE c.role = 'sitter')::bigint,
         count(*) FILTER (WHERE c.role = 'both')::bigint,
         count(*) FILTER (WHERE c.provider = 'google')::bigint,
         count(*) FILTER (WHERE c.provider <> 'google')::bigint,
         count(p.user_id)::bigint,
         coalesce(sum(p.n), 0)::bigint
  FROM cohort c
  LEFT JOIN published p ON p.user_id = c.id
  GROUP BY c.channel
  ORDER BY count(*) DESC, c.channel;
END;
$function$;

-- Motif d'un échec d'inscription : code posé par le formulaire, sinon lu dans le message.
CREATE OR REPLACE FUNCTION public.trf3_signup_failure_code(p_meta jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN lower(coalesce(p_meta ->> 'error_message', '')) LIKE '%for security purposes%' THEN 'rate_limited'
    WHEN coalesce(p_meta ->> 'error_code', p_meta ->> 'code', p_meta ->> 'reason', '') <> ''
      THEN coalesce(p_meta ->> 'error_code', p_meta ->> 'code', p_meta ->> 'reason')
    ELSE 'unknown'
  END
$function$;
REVOKE ALL ON FUNCTION public.trf3_signup_failure_code(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trf3_signup_failure_code(jsonb) TO service_role;

-- get_signup_funnel_metrics : seule la lecture du motif change (trf3_motifs_echec).
DO $do$
DECLARE
  v_def text := pg_get_functiondef('public.get_signup_funnel_metrics(integer)'::regprocedure);
  v_old text := 'COALESCE(metadata->>''code'', metadata->>''reason'', ''unknown'') AS code';
  v_new text := 'public.trf3_signup_failure_code(metadata) AS code /* trf3_motifs_echec */';
BEGIN
  IF position('trf3_motifs_echec' IN v_def) > 0 THEN
    RETURN;
  END IF;
  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'get_signup_funnel_metrics : lecture du motif introuvable, migration à revoir';
  END IF;
  EXECUTE replace(v_def, v_old, v_new);
END
$do$;

-- TRF-4 : relevé hebdomadaire Search Console.
CREATE TABLE IF NOT EXISTS public.seo_gsc_snapshots (
  period_end date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('page', 'query')),
  key text NOT NULL CHECK (char_length(key) <= 400),
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  position numeric(6,2),
  top_page text CHECK (top_page IS NULL OR char_length(top_page) <= 400),
  period_days integer NOT NULL DEFAULT 28,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (period_end, kind, key)
);
CREATE INDEX IF NOT EXISTS seo_gsc_snapshots_key_idx ON public.seo_gsc_snapshots (kind, key, period_end DESC);
ALTER TABLE public.seo_gsc_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.seo_gsc_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.seo_gsc_snapshots TO authenticated;
GRANT ALL ON TABLE public.seo_gsc_snapshots TO service_role;
DROP POLICY IF EXISTS seo_gsc_snapshots_admin_read ON public.seo_gsc_snapshots;
CREATE POLICY seo_gsc_snapshots_admin_read ON public.seo_gsc_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- TRF-4 : journal des actions SEO.
CREATE TABLE IF NOT EXISTS public.seo_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor uuid,
  kind text NOT NULL CHECK (kind IN ('titre_description', 'indexnow', 'redirection', 'noindex', 'fusion', 'traite', 'gabarit')),
  path text NOT NULL CHECK (char_length(path) <= 400),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  before jsonb,
  after jsonb
);
CREATE INDEX IF NOT EXISTS seo_action_log_path_idx ON public.seo_action_log (path, created_at DESC);
ALTER TABLE public.seo_action_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.seo_action_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.seo_action_log TO authenticated;
GRANT ALL ON TABLE public.seo_action_log TO service_role;
DROP POLICY IF EXISTS seo_action_log_admin_read ON public.seo_action_log;
CREATE POLICY seo_action_log_admin_read ON public.seo_action_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS seo_action_log_admin_insert ON public.seo_action_log;
CREATE POLICY seo_action_log_admin_insert ON public.seo_action_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND actor = auth.uid());

-- Un titre ou une description d'article qui change s'inscrit au journal.
CREATE OR REPLACE FUNCTION public.trf4_log_article_meta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Repère : trf4_collecte.
  IF NEW.meta_title IS DISTINCT FROM OLD.meta_title
     OR NEW.meta_description IS DISTINCT FROM OLD.meta_description THEN
    INSERT INTO public.seo_action_log (actor, kind, path, before, after)
    VALUES (
      auth.uid(), 'titre_description', '/actualites/' || NEW.slug,
      jsonb_build_object('meta_title', OLD.meta_title, 'meta_description', OLD.meta_description),
      jsonb_build_object('meta_title', NEW.meta_title, 'meta_description', NEW.meta_description)
    );
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.trf4_log_article_meta() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trf4_log_article_meta ON public.articles;
CREATE TRIGGER trf4_log_article_meta
  AFTER UPDATE OF meta_title, meta_description ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.trf4_log_article_meta();

-- Les deux actions du 15/11/2026, faites avant le journal.
INSERT INTO public.seo_action_log (created_at, kind, path, note, after)
SELECT '2026-11-15 20:35:00+00', 'titre_description', '/actualites/c-est-quoi-le-house-sitting',
       'Titre et description réécrits depuis l''éditeur admin',
       jsonb_build_object('meta_title', 'House sitting et home sitter : définition, prix')
WHERE NOT EXISTS (SELECT 1 FROM public.seo_action_log WHERE path = '/actualites/c-est-quoi-le-house-sitting' AND kind = 'titre_description');
INSERT INTO public.seo_action_log (created_at, kind, path, note)
SELECT '2026-11-15 21:21:00+00', 'gabarit', '/house-sitting/*',
       '160 pages villes : « Home sitter à {ville} » devient « Garde de maison et d''animaux à {ville} » (migration 0173)'
WHERE NOT EXISTS (SELECT 1 FROM public.seo_action_log WHERE path = '/house-sitting/*' AND kind = 'gabarit');
