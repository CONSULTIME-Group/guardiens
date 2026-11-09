-- Lot ADM12 · Rouges vrais, pastilles d'accord (arène admin du 09/11/2026,
-- école « Une seule liste » complétée de « Fiabilité d'abord », GO de Jérémie).
--
-- Constat du 09/11/2026 (claude/arene/2026-11-09-admin-pastilles/) :
-- - trois voyants rouges faux ou périmés sur la vue d'ensemble : un échec isolé
--   de send-alert-digest suivi de trois succès, deux signaux de file des
--   récapitulatifs levés à 9 h alors que la file se vide jusqu'à 13 h, un
--   signal de plafond Prerender du 13/10 jamais refermé ;
-- - la même file « annonces sans candidature » comptée 8 (menu), 6 (réalité
--   à 48 h) et 3 (vue d'ensemble).
--
-- Règle : un voyant est rouge tant que sa cause est présente, pas plus ; une
-- annonce sans candidature = publiée depuis 48 h, départ à venir, aucune
-- candidature active (refusées et annulées ne comptent pas).
-- Rejouable : CREATE OR REPLACE et remplacements gardés.

-- 1. Pastille Annonces : même définition que le signal et la page.
CREATE OR REPLACE FUNCTION public.admin_menu_badges()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin only' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'verifications', (SELECT count(*) FROM profiles
       WHERE identity_verification_status IN ('pending','needs_review')
          OR (identity_verification_status = 'not_submitted'
              AND (identity_document_url IS NOT NULL OR identity_selfie_url IS NOT NULL))),
    'experiences', (SELECT count(*) FROM external_experiences WHERE verification_status = 'pending'),
    'skills', (SELECT count(*) FROM skills_library WHERE status = 'pending')
       + (SELECT count(DISTINCT c) FROM (
            SELECT unnest(competences) AS c FROM sitter_profiles WHERE competences IS NOT NULL
            UNION ALL
            SELECT unnest(competences) FROM owner_profiles WHERE competences IS NOT NULL
          ) s
          WHERE c IS NOT NULL AND c <> ''
            AND NOT EXISTS (SELECT 1 FROM competences_validees v WHERE v.label = s.c)),
    'reviewsModeration', (SELECT count(*) FROM reviews WHERE review_type = 'annulation' AND moderation_status = 'en_attente')
       + (SELECT count(*) FROM reviews WHERE review_type = 'annulation' AND response_status = 'en_attente'),
    'reviewDisputes', (SELECT count(*) FROM review_disputes WHERE status = 'pending'),
    'reports', (SELECT count(*) FROM reports WHERE status IN ('new','in_progress')),
    'contactMessages', (SELECT count(*) FROM contact_messages WHERE status IN ('new','en_cours')),
    'adminMessageFailed', (SELECT count(*) FROM admin_message_logs WHERE status = 'failed' AND sent_at >= now() - interval '7 days'),
    'errors', (SELECT count(*) FROM error_logs WHERE resolved_at IS NULL AND severity IS DISTINCT FROM 'ignored_third_party'),
    'guideRequests', (SELECT count(*) FROM guide_requests WHERE status = 'pending'),
    'analysisRequests', (SELECT count(*) FROM analysis_requests WHERE status = 'new'),
    'deletionRequests', (SELECT count(*) FROM account_deletion_requests WHERE status = 'pending'),
    'sitsToStaff', (SELECT count(*) FROM sits s
       WHERE s.status = 'published'
         AND s.published_at IS NOT NULL
         AND s.published_at <= now() - interval '48 hours'
         AND (s.start_date IS NULL OR s.start_date::date >= v_today)
         AND NOT EXISTS (SELECT 1 FROM applications a
                         WHERE a.sit_id = s.id AND a.status NOT IN ('rejected','cancelled')))
  );
END;
$function$;

-- 2. Signal du matin : candidatures actives seulement, départ à venir.
CREATE OR REPLACE FUNCTION public.detect_stale_sits()
 RETURNS TABLE(sit_id uuid, owner_id uuid, sit_title text, sit_city text, latitude double precision, longitude double precision, days_since_published integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.user_id AS owner_id, s.title, s.city, p.latitude, p.longitude,
         EXTRACT(day FROM now() - COALESCE(s.published_at, s.created_at))::integer AS days_since_published
  FROM public.sits s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.status = 'published'
    AND COALESCE(s.published_at, s.created_at) <= now() - interval '48 hours'
    AND (s.start_date IS NULL OR s.start_date::date >= (now() AT TIME ZONE 'Europe/Paris')::date)
    AND NOT EXISTS (SELECT 1 FROM public.applications a
                    WHERE a.sit_id = s.id AND a.status NOT IN ('rejected', 'cancelled'));
$function$;

-- 3. Suivi des tâches : les deux récapitulatifs d'annonces ont un nom français.
DO $mig$
DECLARE
  d text;
  fixed text;
BEGIN
  SELECT pg_get_functiondef('public.admin_cron_health()'::regprocedure) INTO d;
  IF position('send-alert-digest' IN d) = 0 THEN
    fixed := replace(d,
      $q$('admin-activity-analysis', 1440, 'Analyse IA quotidienne')$q$,
      $q$('admin-activity-analysis', 1440, 'Analyse IA quotidienne'),
      ('send-alert-digest', 480, 'Récapitulatif des alertes d''annonces'),
      ('send-nearby-daily-digest', 1440, 'Récapitulatif quotidien des annonces à proximité')$q$);
    IF fixed = d THEN
      RAISE EXCEPTION 'admin_cron_health : liste des tâches introuvable';
    END IF;
    EXECUTE fixed;
  END IF;
END
$mig$;

-- 4. Fermeture des signaux avec leur cause.
DO $mig$
DECLARE
  d text;
  fixed text;
BEGIN
  SELECT pg_get_functiondef('public.auto_resolve_admin_signals()'::regprocedure) INTO d;
  fixed := d;

  -- 4a. Annonce sans candidature : une candidature refusée ou annulée ne la sort pas.
  fixed := replace(fixed,
    $q$(s.signal_type = 'no_applications' AND EXISTS (
          SELECT 1 FROM public.applications a WHERE a.sit_id = s.entity_id))$q$,
    $q$(s.signal_type = 'no_applications' AND EXISTS (
          SELECT 1 FROM public.applications a WHERE a.sit_id = s.entity_id
            AND a.status NOT IN ('rejected', 'cancelled')))$q$);

  -- 4b. Signaux expirés : un email détruit est une information, close à 7 jours.
  fixed := replace(fixed,
    $q$OR (s.signal_type = 'notification_delivery_failed_burst' AND s.detected_at < now() - interval '2 days'))$q$,
    $q$OR (s.signal_type = 'notification_delivery_failed_burst' AND s.detected_at < now() - interval '2 days')
        OR (s.signal_type = 'email_destroyed' AND s.detected_at < now() - interval '7 days'))$q$);

  -- 4c. Trois causes qui disparaissent : rendu revenu, file vidée, annonce publiée.
  IF position('adm12_prerender_back' IN fixed) = 0 THEN
    fixed := replace(fixed,
      $q$  ), city_coverage_refreshed AS ($q$,
      $q$  ), adm12_prerender_back AS (
    SELECT s.id, s.signal_type, 'auto_resolved_prerender_rendering_again'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'prerender_monthly_budget_reached'
      AND EXISTS (
        SELECT 1 FROM public.prerender_recache_log l
        WHERE l.ok AND l.created_at > s.detected_at)
  ), adm12_digest_drained AS (
    SELECT s.id, s.signal_type, 'auto_resolved_digest_queue_drained'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'digest_queue_morning_backlog'
      AND NOT EXISTS (
        SELECT 1 FROM public.sitter_digest_queue q
        WHERE q.status = 'queued' AND (q.queued_at IS NULL OR q.queued_at <= s.detected_at))
  ), adm12_sit_published AS (
    SELECT s.id, s.signal_type, 'auto_resolved_sit_published'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'sit_publish_error'
      AND s.entity_type = 'sit'
      AND EXISTS (
        SELECT 1 FROM public.sits si
        WHERE si.id = s.entity_id
          AND si.status IN ('published', 'confirmed', 'in_progress', 'completed', 'archived'))
  ), city_coverage_refreshed AS ($q$);
    fixed := replace(fixed,
      $q$          UNION ALL SELECT * FROM broadcast_sit_settled) u$q$,
      $q$          UNION ALL SELECT * FROM broadcast_sit_settled
          UNION ALL SELECT * FROM adm12_prerender_back
          UNION ALL SELECT * FROM adm12_digest_drained
          UNION ALL SELECT * FROM adm12_sit_published) u$q$);
  END IF;

  IF position('adm12_prerender_back' IN fixed) = 0
     OR position('UNION ALL SELECT * FROM adm12_sit_published' IN fixed) = 0
     OR position($q$'email_destroyed' AND s.detected_at$q$ IN fixed) = 0
     OR position($q$a.sit_id = s.entity_id
            AND a.status NOT IN ('rejected', 'cancelled')$q$ IN fixed) = 0 THEN
    RAISE EXCEPTION 'auto_resolve_admin_signals : remplacement ADM12 incomplet';
  END IF;
  IF fixed IS DISTINCT FROM d THEN
    EXECUTE fixed;
  END IF;
END
$mig$;

-- 5. État du site : un voyant rouge tant que sa cause est présente, avec une
--    phrase française et un lien.
CREATE OR REPLACE FUNCTION public.admin_site_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cron jsonb;
  v_bad_tasks text[];
  v_unmonitored text[];
  v_tasks jsonb;
  v_email jsonb;
  v_ia jsonb;
  v_seo jsonb;
  v_errors jsonb;
  v_audience jsonb;
  v_last_analysis timestamptz;
  v_ia_error text;
  v_new_errors int;
  v_yesterday date := ((now() AT TIME ZONE 'Europe/Paris')::date - 1);
  v_yesterday_views int;
  v_baseline numeric;
  v_baseline_days int;
  h record;
  v_email_bad text[] := '{}';
  v_signal_titles text[];
  v_paris timestamp := now() AT TIME ZONE 'Europe/Paris';
  v_cycle_local timestamp;
  v_cycle_start timestamptz;
  v_next_cycle timestamptz;
  v_renders int;
  v_allowance int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR coalesce(auth.jwt()->>'role', '') = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Tâches : en retard, ou dernier passage en échec. Un échec rattrapé par
  -- le passage suivant ne laisse pas de rouge (il reste visible sur la carte
  -- des tâches, « avec incidents sur 7 jours »).
  v_cron := public.admin_cron_health();
  SELECT coalesce(array_agg(x->>'label' ORDER BY x->>'label'), '{}')
    INTO v_bad_tasks
    FROM jsonb_array_elements(v_cron) x
   WHERE x->>'state' = 'critical' OR x->>'last_status' = 'failed';
  SELECT coalesce(array_agg(t.edge_name ORDER BY t.edge_name), '{}')
    INTO v_unmonitored
    FROM (
      SELECT DISTINCT ON (l.edge_name) l.edge_name, l.status
        FROM public.cron_run_log l
       WHERE l.started_at > now() - interval '24 hours'
       ORDER BY l.edge_name, l.started_at DESC
    ) t
   WHERE t.status = 'failed'
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_cron) x WHERE x->>'edge_name' = t.edge_name);
  v_tasks := jsonb_build_object(
    'key', 'tasks', 'label', 'Tâches planifiées',
    'state', CASE WHEN cardinality(v_bad_tasks) + cardinality(v_unmonitored) > 0 THEN 'alert' ELSE 'ok' END,
    'detail', CASE WHEN cardinality(v_bad_tasks) + cardinality(v_unmonitored) > 0
      THEN 'Dernier passage en échec ou en retard : '
           || array_to_string((v_bad_tasks || CASE WHEN cardinality(v_unmonitored) > 0
                                                   THEN ARRAY[format('%s tâche(s) technique(s) non suivie(s)', cardinality(v_unmonitored))]
                                                   ELSE '{}'::text[] END)[1:3], ', ')
           || CASE WHEN cardinality(v_bad_tasks) > 3
                   THEN format(' et %s autre(s)', cardinality(v_bad_tasks) - 3) ELSE '' END
      ELSE format('%s tâches suivies, dernier passage réussi pour chacune', jsonb_array_length(v_cron)) END,
    'link', '/admin?plus=taches');

  -- Emails : la file des récapitulatifs se vide jusqu'à 13 h ; son signal ne
  -- compte qu'après 14 h le jour où il est levé, et se ferme quand la file
  -- est vide (auto_resolve_admin_signals).
  SELECT * INTO h FROM public.email_pipeline_health LIMIT 1;
  IF h.stuck_rate_limit IS TRUE THEN v_email_bad := array_append(v_email_bad, 'envois bloqués par la limite de débit'); END IF;
  IF coalesce(h.dlq_last_hour, 0) > 0 THEN v_email_bad := array_append(v_email_bad, format('%s envoi(s) abandonné(s) depuis une heure', h.dlq_last_hour)); END IF;
  IF coalesce(h.deferred_transactional_overdue_2h, 0) > 0 THEN v_email_bad := array_append(v_email_bad, format('%s email(s) de service en retard de plus de 2 h', h.deferred_transactional_overdue_2h)); END IF;
  IF coalesce(h.deferred_pending_over_24h, 0) > 0 THEN v_email_bad := array_append(v_email_bad, format('%s email(s) en attente depuis plus de 24 h', h.deferred_pending_over_24h)); END IF;
  SELECT coalesce(array_agg(DISTINCT CASE s.signal_type
           WHEN 'email_delivery_low' THEN 'livraison des emails dégradée'
           WHEN 'email_queue_failures' THEN 'échecs dans la file d''envoi'
           WHEN 'digest_queue_stalled' THEN 'file des récapitulatifs bloquée'
           WHEN 'digest_queue_morning_backlog' THEN 'récapitulatifs gardiens non partis à 14 h'
           WHEN 'email_recipient_address_invalid' THEN 'adresse de membre refusée par le fournisseur'
         END), '{}')
    INTO v_signal_titles
    FROM public.admin_signals s
   WHERE s.resolved_at IS NULL
     AND s.signal_type IN ('email_delivery_low', 'email_queue_failures', 'digest_queue_stalled',
                           'digest_queue_morning_backlog', 'email_recipient_address_invalid')
     AND NOT (s.signal_type = 'digest_queue_morning_backlog'
              AND (s.detected_at AT TIME ZONE 'Europe/Paris')::date = v_paris::date
              AND v_paris::time < time '14:00');
  v_email_bad := v_email_bad || v_signal_titles;
  v_email := jsonb_build_object(
    'key', 'emails', 'label', 'Emails',
    'state', CASE WHEN cardinality(v_email_bad) > 0 THEN 'alert' ELSE 'ok' END,
    'detail', CASE WHEN cardinality(v_email_bad) > 0 THEN array_to_string(v_email_bad, ', ') ELSE 'File d''envoi normale' END,
    'link', '/admin/emails');

  SELECT max(generated_at) INTO v_last_analysis FROM public.admin_activity_analysis;
  SELECT l.error_message INTO v_ia_error FROM public.cron_run_log l
   WHERE l.edge_name = 'admin-activity-analysis' ORDER BY l.started_at DESC LIMIT 1;
  v_ia := jsonb_build_object(
    'key', 'ai', 'label', 'IA',
    'state', CASE WHEN v_last_analysis IS NULL OR v_last_analysis < now() - interval '26 hours' THEN 'alert' ELSE 'ok' END,
    'detail', CASE
      WHEN v_last_analysis IS NULL OR v_last_analysis < now() - interval '26 hours' THEN
        'Aucune analyse quotidienne depuis '
        || coalesce(to_char(v_last_analysis AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24 h MI'), 'le début')
        || CASE WHEN v_ia_error IS NOT NULL THEN ' : ' || left(v_ia_error, 120)
                ELSE ' (crédits IA à vérifier)' END
      ELSE 'Analyse quotidienne produite le ' || to_char(v_last_analysis AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24 h MI') END,
    'link', '/admin/alma');

  -- Rendu SEO : même compte que public.seo_reserve_render (lot PR3), rendus
  -- réussis depuis le 4 du mois à 0 h (Paris), plafond 9 900, rallonge comprise.
  v_cycle_local := date_trunc('month', v_paris) + interval '3 days';
  IF v_paris < v_cycle_local THEN v_cycle_local := v_cycle_local - interval '1 month'; END IF;
  v_cycle_start := v_cycle_local AT TIME ZONE 'Europe/Paris';
  v_next_cycle := (v_cycle_local + interval '1 month') AT TIME ZONE 'Europe/Paris';
  SELECT count(*)::int INTO v_renders FROM public.prerender_recache_log WHERE ok AND created_at >= v_cycle_start;
  SELECT coalesce(max(a.remaining), 0)::int INTO v_allowance
    FROM public.seo_render_allowance a WHERE a.singleton AND a.expires_at > now();
  v_seo := jsonb_build_object(
    'key', 'seo', 'label', 'Rendu SEO',
    'state', CASE WHEN v_renders >= 9900 AND v_allowance <= 0 THEN 'alert' ELSE 'ok' END,
    'detail', CASE WHEN v_renders >= 9900 AND v_allowance <= 0
      THEN format('Plafond du mois atteint (%s rendus depuis le %s) : les robots reçoivent des pages anciennes jusqu''au %s',
                  v_renders, to_char(v_cycle_local, 'DD/MM'), to_char(v_next_cycle AT TIME ZONE 'Europe/Paris', 'DD/MM'))
      ELSE format('Rendu actif : %s rendus sur 9 900 depuis le %s', v_renders, to_char(v_cycle_local, 'DD/MM')) END,
    'link', '/admin/prerender');

  SELECT count(*) INTO v_new_errors FROM public.error_logs e
   WHERE e.resolved_at IS NULL AND e.severity IS DISTINCT FROM 'ignored_third_party'
     AND e.first_seen_at > now() - interval '24 hours'
     AND coalesce(e.message, '') NOT LIKE '%/\_\_l5e/%';
  v_errors := jsonb_build_object(
    'key', 'errors', 'label', 'Erreurs du site',
    'state', CASE WHEN v_new_errors > 0 THEN 'alert' ELSE 'ok' END,
    'detail', CASE WHEN v_new_errors > 0 THEN format('%s nouvelle(s) erreur(s) depuis 24 h', v_new_errors)
                   ELSE 'Aucune nouvelle erreur depuis 24 h' END,
    'link', '/admin/errors');

  SELECT count(*) INTO v_yesterday_views FROM public.analytics_events a
   WHERE a.event_type = 'page_view'
     AND a.created_at >= (v_yesterday::timestamp AT TIME ZONE 'Europe/Paris')
     AND a.created_at < ((v_yesterday + 1)::timestamp AT TIME ZONE 'Europe/Paris');
  SELECT avg(n), count(*) INTO v_baseline, v_baseline_days FROM (
    SELECT (a.created_at AT TIME ZONE 'Europe/Paris')::date AS d, count(*) AS n
      FROM public.analytics_events a
     WHERE a.event_type = 'page_view'
       AND a.created_at >= greatest(timestamptz '2026-10-14 22:00:00+00', ((v_yesterday - 7)::timestamp AT TIME ZONE 'Europe/Paris'))
       AND a.created_at < (v_yesterday::timestamp AT TIME ZONE 'Europe/Paris')
     GROUP BY 1) t;
  v_audience := jsonb_build_object(
    'key', 'audience', 'label', 'Mesure d''audience',
    'state', CASE WHEN v_baseline_days >= 2 AND v_baseline >= 50 AND v_yesterday_views < v_baseline / 2
                  THEN 'alert' ELSE 'ok' END,
    'detail', CASE
      WHEN v_baseline_days >= 2 THEN format('%s pages vues hier, %s par jour en moyenne avant',
                                            v_yesterday_views, round(v_baseline))
      ELSE format('%s pages vues hier (comparaison possible à partir de 2 jours mesurés)', v_yesterday_views) END,
    'link', '/admin/traffic?tab=interne');

  RETURN jsonb_build_array(v_tasks, v_email, v_ia, v_seo, v_errors, v_audience);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_site_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_site_health() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_menu_badges() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_menu_badges() TO authenticated;
REVOKE ALL ON FUNCTION public.detect_stale_sits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_stale_sits() TO service_role;

-- 6. Refermer tout de suite ce que la cause ne justifie plus.
SELECT * FROM public.auto_resolve_admin_signals();
