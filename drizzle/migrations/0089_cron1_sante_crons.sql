-- Lot CRON1 (16/10/2026) : la santé des crons ignore les tâches désactivées.
-- « Relance meilleurs gardiens dormants » (nudge-dormant-top-sitters) est
-- désactivée dans cron.job depuis le 16/09/2026 et s'affichait « critique ».
-- Base : définition en production le 16/10/2026 (md5 5c99276f). Rejouable.
CREATE OR REPLACE FUNCTION public.admin_cron_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;

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
      ('nudge-repeated-republished-sits', 10080, 'Détection republications répétées')
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
            WHEN COALESCE(rs.failed_7d, 0) >= 1 OR COALESCE(rs.partial_7d, 0) >= 1 THEN 'degraded'
            ELSE 'ok'
          END
        WHEN lr.started_at IS NULL
             OR lr.started_at < now() - (c.expected_interval_min * 2 || ' minutes')::interval
          THEN 'critical'
        WHEN COALESCE(rs.failed_7d, 0) >= 1 OR COALESCE(rs.partial_7d, 0) >= 1 THEN 'degraded'
        ELSE 'ok'
      END AS state
    FROM crons c
    LEFT JOIN last_runs lr ON lr.edge_name = c.edge_name
    LEFT JOIN recent_stats rs ON rs.edge_name = c.edge_name
    LEFT JOIN last_3 l3 ON l3.edge_name = c.edge_name
    -- Lot CRON1 : une tâche dont toutes les planifications sont désactivées
    -- (cron.job.active = false) n'est plus évaluée ; sans planification
    -- trouvée, elle reste évaluée (critique si elle ne tourne pas).
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

REVOKE ALL ON FUNCTION public.admin_cron_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cron_health() TO authenticated, service_role;
