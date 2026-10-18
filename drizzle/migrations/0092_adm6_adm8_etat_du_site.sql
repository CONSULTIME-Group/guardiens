-- Lots ADM6 et ADM8 (18/10/2026, audit de l'admin, pilotage et pannes) :
-- un encart « État du site » qui dit vrai, sans faux rouge.
-- 1. admin_cron_health (base : 0091, identique à la production le 18/10/2026) :
--    - lisible aussi par service_role (l'email du matin lit l'état du site) ;
--    - « dégradé » seulement pour un échec : un passage « partial » (report
--      volontaire, limite de débit d'envoi depuis CRON1) reste vert ;
--    - suit six fonctions qui journalisent désormais leurs passages (ADM8) :
--      relance des brouillons, rappels de messages, code postal manquant,
--      photo manquante, galerie gardien, analyse IA quotidienne ;
--    - une fonction suivie depuis peu et jamais passée attend son premier
--      passage (vert « en attente ») au lieu d'un rouge immédiat.
-- 2. admin_site_health : six voyants (tâches, emails, IA, SEO, erreurs,
--    audience), une lecture, admin ou service_role.
-- Rejouable.
CREATE OR REPLACE FUNCTION public.admin_cron_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR coalesce(auth.jwt()->>'role', '') = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH crons(edge_name, expected_interval_min, label) AS (
    VALUES
      ('detect-deploy-and-mark-dirty', 10, 'Détection des déploiements SEO'),
      ('consume-seo-dirty', 15, 'Consommation du flag SEO'),
      ('notify-sitters-on-publish', 15, 'Alerte gardiens à la publication'),
      ('dispatch-web-push', 15, 'Distribution des notifications push'),
      ('evaluate-journeys', 60, 'Évaluation des parcours'),
      ('auto-transition-sits', 60, 'Transitions de statut de garde'),
      ('send-mission-nudges', 60, 'Relances missions d''entraide'),
      ('nudge-suspicious-accounts', 240, 'Détection comptes suspects'),
      ('close-orphan-applications', 1440, 'Clôture des candidatures orphelines'),
      ('publish-stale-reviews', 1440, 'Publication des avis en attente'),
      ('auto-close-small-missions', 1440, 'Clôture des missions d''entraide'),
      ('purge-identity-documents', 1440, 'Purge des pièces d''identité'),
      ('nudge-stale-draft', 1440, 'Relance brouillons dormants'),
      ('send-sitter-daily-digest', 1440, 'Digest quotidien gardiens'),
      ('nudge-affinity-onboarding', 1440, 'Relance onboarding affinité'),
      ('nudge-owner-no-applications', 1440, 'Relance annonces sans candidature'),
      ('nudge-owner-pending-application', 960, 'Relance candidatures en attente'),
      ('nudge-owner-unconfirmed-sit', 1440, 'Relance annonces non confirmées'),
      ('nudge-sitter-dormant', 10080, 'Relance gardiens dormants'),
      ('nudge-verification-stale', 10080, 'Relance vérifications d''identité'),
      ('send-sit-reminders', 1440, 'Rappels in-app avant/après garde'),
      ('send-rappel-j7', 1440, 'Email rappel J-7 avant garde'),
      ('send-rappel-j48', 1440, 'Email rappel J-48h avant garde'),
      ('send-avis-j1', 1440, 'Email relance avis J+1'),
      ('send-avis-j5', 1440, 'Email relance avis J+5'),
      ('send-avis-j10', 1440, 'Email relance avis J+10'),
      ('send-avis-j20', 1440, 'Email relance avis J+20'),
      ('remind-unread-messages', 1440, 'Relance messages non lus (24h)'),
      ('check-content-quality', 10080, 'Détecteur de défauts de contenu'),
      ('send-weekly-nearby-digest', 10080, 'Digest hebdo à proximité'),
      ('send-mutual-aid-weekly-digest', 10080, 'Digest hebdo entraide'),
      ('nudge-untapped-cities', 10080, 'Relance villes sans activité'),
      ('nudge-dormant-top-sitters', 10080, 'Relance meilleurs gardiens dormants'),
      ('nudge-repeated-cancellations', 10080, 'Détection annulations répétées'),
      ('nudge-repeated-republished-sits', 10080, 'Détection republications répétées'),
      ('alert-admin-signals', 1440, 'Email admin du matin'),
      ('send-sit-draft-reminder', 1440, 'Relance des brouillons d''annonce'),
      ('send-message-reminders', 1440, 'Rappels de messages'),
      ('relance-cp-manquant', 10080, 'Relance code postal manquant'),
      ('nudge-missing-photo', 10080, 'Relance photo manquante'),
      ('nudge-sitter-gallery-photo', 10080, 'Relance galerie gardien'),
      ('admin-activity-analysis', 1440, 'Analyse IA quotidienne')
  ),
  -- Suivi récent : jamais rouge avant le premier passage attendu.
  grace(edge_name, since) AS (
    VALUES
      ('alert-admin-signals', timestamptz '2026-10-18 10:00:00+00'),
      ('send-sit-draft-reminder', timestamptz '2026-10-18 16:00:00+00'),
      ('send-message-reminders', timestamptz '2026-10-18 16:00:00+00'),
      ('relance-cp-manquant', timestamptz '2026-10-18 16:00:00+00'),
      ('nudge-missing-photo', timestamptz '2026-10-18 16:00:00+00'),
      ('nudge-sitter-gallery-photo', timestamptz '2026-10-18 16:00:00+00'),
      ('admin-activity-analysis', timestamptz '2026-10-18 16:00:00+00')
  ),
  push_backlog AS (
    SELECT count(*) AS waiting
    FROM public.push_delivery_jobs
    WHERE status = 'pending' AND available_at <= now() - interval '15 minutes'
      AND expires_at > now()
  ),
  last_runs AS (
    SELECT DISTINCT ON (edge_name) edge_name, started_at, finished_at, status, error_message
    FROM public.cron_run_log ORDER BY edge_name, started_at DESC
  ),
  recent_stats AS (
    SELECT edge_name,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days') AS runs_7d,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days' AND status = 'failed') AS failed_7d,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days' AND status = 'partial') AS partial_7d
    FROM public.cron_run_log GROUP BY edge_name
  ),
  last_3 AS (
    SELECT edge_name, COUNT(*) FILTER (WHERE status = 'failed') AS failed_in_last_3
    FROM (SELECT edge_name, status,
            ROW_NUMBER() OVER (PARTITION BY edge_name ORDER BY started_at DESC) AS rn
          FROM public.cron_run_log WHERE finished_at IS NOT NULL) t
    WHERE rn <= 3 GROUP BY edge_name
  ),
  evaluated AS (
    SELECT c.edge_name, c.label, c.expected_interval_min,
      lr.started_at, lr.finished_at, lr.status AS last_status, lr.error_message,
      rs.runs_7d, rs.failed_7d, rs.partial_7d, l3.failed_in_last_3,
      CASE
        WHEN c.edge_name = 'dispatch-web-push' THEN
          CASE
            WHEN (SELECT waiting FROM push_backlog) > 0
                 AND (lr.started_at IS NULL
                      OR lr.started_at < now() - (c.expected_interval_min * 2 || ' minutes')::interval)
              THEN 'critical'
            WHEN COALESCE(rs.failed_7d, 0) >= 1 THEN 'degraded'
            ELSE 'ok'
          END
        WHEN lr.started_at IS NULL AND g.since IS NOT NULL
             AND now() < g.since + (c.expected_interval_min * 2 || ' minutes')::interval
          THEN 'ok'
        WHEN lr.started_at IS NULL
             OR lr.started_at < now() - (c.expected_interval_min * 2 || ' minutes')::interval
          THEN 'critical'
        WHEN COALESCE(rs.failed_7d, 0) >= 1 THEN 'degraded'
        ELSE 'ok'
      END AS state
    FROM crons c
    LEFT JOIN grace g ON g.edge_name = c.edge_name
    LEFT JOIN last_runs lr ON lr.edge_name = c.edge_name
    LEFT JOIN recent_stats rs ON rs.edge_name = c.edge_name
    LEFT JOIN last_3 l3 ON l3.edge_name = c.edge_name
    WHERE NOT (
      EXISTS (SELECT 1 FROM cron.job j WHERE j.command LIKE '%/functions/v1/' || c.edge_name || '''%')
      AND NOT EXISTS (SELECT 1 FROM cron.job j WHERE j.active AND j.command LIKE '%/functions/v1/' || c.edge_name || '''%')
    )
  )
  SELECT jsonb_agg(jsonb_build_object(
    'edge_name', e.edge_name, 'label', e.label,
    'expected_interval_min', e.expected_interval_min,
    'last_started_at', e.started_at, 'last_finished_at', e.finished_at,
    'last_status', e.last_status, 'last_error', e.error_message,
    'age_minutes', CASE WHEN e.started_at IS NULL THEN NULL
                        ELSE GREATEST(0, EXTRACT(EPOCH FROM (now() - e.started_at)) / 60)::int END,
    'runs_7d', COALESCE(e.runs_7d, 0), 'failed_7d', COALESCE(e.failed_7d, 0),
    'partial_7d', COALESCE(e.partial_7d, 0),
    'failed_in_last_3', COALESCE(e.failed_in_last_3, 0),
    'state', e.state
  ) ORDER BY CASE e.state WHEN 'critical' THEN 0 WHEN 'degraded' THEN 1 ELSE 2 END, e.label)
  INTO result FROM evaluated e;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

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
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR coalesce(auth.jwt()->>'role', '') = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 1. Tâches planifiées : fonctions suivies en retard ou en échec, et tout
  --    échec journalisé depuis 24 h par une fonction non suivie.
  v_cron := public.admin_cron_health();
  SELECT coalesce(array_agg(x->>'label' ORDER BY x->>'label'), '{}')
    INTO v_bad_tasks
    FROM jsonb_array_elements(v_cron) x
   WHERE x->>'state' IN ('critical', 'degraded');
  SELECT coalesce(array_agg(DISTINCT l.edge_name), '{}')
    INTO v_unmonitored
    FROM public.cron_run_log l
   WHERE l.status = 'failed' AND l.started_at > now() - interval '24 hours'
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_cron) x WHERE x->>'edge_name' = l.edge_name);
  v_tasks := jsonb_build_object(
    'key', 'tasks', 'label', 'Tâches planifiées',
    'state', CASE WHEN cardinality(v_bad_tasks) + cardinality(v_unmonitored) > 0 THEN 'alert' ELSE 'ok' END,
    'detail', CASE WHEN cardinality(v_bad_tasks) + cardinality(v_unmonitored) > 0
      THEN array_to_string((v_bad_tasks || v_unmonitored)[1:3], ', ')
           || CASE WHEN cardinality(v_bad_tasks) + cardinality(v_unmonitored) > 3
                   THEN format(' et %s autre(s)', cardinality(v_bad_tasks) + cardinality(v_unmonitored) - 3) ELSE '' END
      ELSE format('%s tâches suivies, aucune en retard ou en échec', jsonb_array_length(v_cron)) END,
    'link', NULL);

  -- 2. Emails : file d'envoi et signaux d'envoi ouverts.
  SELECT * INTO h FROM public.email_pipeline_health LIMIT 1;
  IF h.stuck_rate_limit IS TRUE THEN v_email_bad := v_email_bad || 'envois bloqués par la limite de débit'; END IF;
  IF coalesce(h.dlq_last_hour, 0) > 0 THEN v_email_bad := v_email_bad || format('%s envoi(s) abandonné(s) depuis une heure', h.dlq_last_hour); END IF;
  IF coalesce(h.deferred_transactional_overdue_2h, 0) > 0 THEN v_email_bad := v_email_bad || format('%s email(s) de service en retard de plus de 2 h', h.deferred_transactional_overdue_2h); END IF;
  IF coalesce(h.deferred_pending_over_24h, 0) > 0 THEN v_email_bad := v_email_bad || format('%s email(s) en attente depuis plus de 24 h', h.deferred_pending_over_24h); END IF;
  IF EXISTS (SELECT 1 FROM public.admin_signals s WHERE s.resolved_at IS NULL
             AND s.signal_type IN ('email_delivery_low', 'email_queue_failures', 'digest_queue_stalled',
                                   'digest_queue_morning_backlog', 'email_recipient_address_invalid')) THEN
    v_email_bad := v_email_bad || 'signal d''envoi ouvert';
  END IF;
  v_email := jsonb_build_object(
    'key', 'emails', 'label', 'Emails',
    'state', CASE WHEN cardinality(v_email_bad) > 0 THEN 'alert' ELSE 'ok' END,
    'detail', CASE WHEN cardinality(v_email_bad) > 0 THEN array_to_string(v_email_bad, ', ') ELSE 'File d''envoi normale' END,
    'link', '/admin/emails');

  -- 3. IA : l'analyse quotidienne sert de témoin (même clé que Alma et les aides de rédaction).
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

  -- 4. SEO : rendu des pages pour les robots.
  v_seo := jsonb_build_object(
    'key', 'seo', 'label', 'Rendu SEO',
    'state', CASE WHEN EXISTS (SELECT 1 FROM public.admin_signals s WHERE s.resolved_at IS NULL
                               AND s.signal_type = 'prerender_monthly_budget_reached') THEN 'alert' ELSE 'ok' END,
    'detail', CASE WHEN EXISTS (SELECT 1 FROM public.admin_signals s WHERE s.resolved_at IS NULL
                                AND s.signal_type = 'prerender_monthly_budget_reached')
      THEN 'Plafond mensuel atteint : les robots reçoivent des pages anciennes'
      ELSE 'Rendu actif' END,
    'link', '/admin/prerender');

  -- 5. Erreurs du site : nouvelles erreurs apparues depuis 24 h.
  SELECT count(*) INTO v_new_errors FROM public.error_logs e
   WHERE e.resolved_at IS NULL AND e.severity IS DISTINCT FROM 'ignored_third_party'
     AND e.first_seen_at > now() - interval '24 hours'
     -- Point de mesure de l'hébergeur (Lovable), hors du code du site.
     AND coalesce(e.message, '') NOT LIKE '%/\_\_l5e/%';
  v_errors := jsonb_build_object(
    'key', 'errors', 'label', 'Erreurs du site',
    'state', CASE WHEN v_new_errors > 0 THEN 'alert' ELSE 'ok' END,
    'detail', CASE WHEN v_new_errors > 0 THEN format('%s nouvelle(s) erreur(s) depuis 24 h', v_new_errors)
                   ELSE 'Aucune nouvelle erreur depuis 24 h' END,
    'link', '/admin/errors');

  -- 6. Mesure d'audience : pages vues d'hier contre la moyenne des 7 jours
  --    d'avant, comptés seulement depuis le 15/10/2026 (robots exclus le 14/10
  --    au soir, lot perf 1 : avant cette date les chiffres ne se comparent pas).
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
