-- Erreur admin du 30/10/2026 (/admin, « Confier à Claude », lot ERRFIX du
-- 31/10) : admin_site_health a renvoyé 500 « canceling statement due to
-- statement timeout » (57014). Le rôle authenticated plafonne une requête à
-- 8 s ; en base le 31/10/2026, l'appel durait 3,2 s en moyenne sur 47 appels
-- et 5,3 s sur 12 autres, jusqu'à 7,4 s.
--
-- Cause : admin_cron_health, appelée par admin_site_health et par la carte des
-- tâches, lisait tout cron_run_log trois fois (dernier passage par DISTINCT ON,
-- statistiques des 7 jours par GROUP BY, trois derniers passages par
-- ROW_NUMBER), soit 43 933 lignes et environ 45 000 pages touchées par appel,
-- un journal qui grandit d'environ 1 500 lignes par jour.
--
-- Correctif : mêmes résultats, trois lectures LATERAL bornées par tâche suivie
-- sur l'index existant idx_cron_run_log_recent (environ 4 000 pages, 10 ms),
-- et un index sur started_at pour la liste des échecs des 24 dernières heures
-- de admin_site_health. Droits inchangés (CREATE OR REPLACE les garde).
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
    -- Une lecture d'index par tâche suivie (edge_name, started_at DESC),
    -- jamais tout le journal : dernier passage, passages des 7 jours, trois
    -- derniers passages terminés.
    LEFT JOIN LATERAL (
      SELECT l.started_at, l.finished_at, l.status, l.error_message
      FROM public.cron_run_log l
      WHERE l.edge_name = c.edge_name
      ORDER BY l.started_at DESC LIMIT 1
    ) lr ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS runs_7d,
        COUNT(*) FILTER (WHERE l.status = 'failed') AS failed_7d,
        COUNT(*) FILTER (WHERE l.status = 'partial') AS partial_7d
      FROM public.cron_run_log l
      WHERE l.edge_name = c.edge_name AND l.started_at >= now() - interval '7 days'
    ) rs ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE t.status = 'failed') AS failed_in_last_3
      FROM (SELECT l.status FROM public.cron_run_log l
            WHERE l.edge_name = c.edge_name AND l.finished_at IS NOT NULL
            ORDER BY l.started_at DESC LIMIT 3) t
    ) l3 ON true
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

CREATE INDEX IF NOT EXISTS idx_cron_run_log_started_at
  ON public.cron_run_log (started_at DESC);

REVOKE ALL ON FUNCTION public.admin_cron_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cron_health() TO authenticated, service_role;
