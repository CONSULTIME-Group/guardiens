
CREATE OR REPLACE FUNCTION public.admin_cron_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH crons(edge_name, expected_interval_min, label) AS (
    VALUES
      ('flush-prerender-cache', 15, 'Rafraîchissement Prerender'),
      ('nudge-affinity-onboarding', 1440, 'Relance onboarding affinité'),
      ('nudge-owner-no-applications', 1440, 'Relance annonces sans candidature'),
      ('nudge-owner-pending-application', 1440, 'Relance candidatures en attente'),
      ('nudge-sitter-dormant', 1440, 'Relance gardiens dormants'),
      ('nudge-verification-stale', 1440, 'Relance vérifications d''identité'),
      ('auto-transition-sits', 60, 'Transitions de statut de garde'),
      ('send-sit-reminders', 1440, 'Rappels in-app avant/après garde'),
      ('send-rappel-j7', 1440, 'Email rappel J-7 avant garde'),
      ('send-rappel-j48', 1440, 'Email rappel J-48h avant garde'),
      ('send-avis-j1', 1440, 'Email relance avis J+1'),
      ('send-avis-j5', 1440, 'Email relance avis J+5'),
      ('remind-unread-messages', 1440, 'Relance messages non lus (24h)')
  ),
  last_runs AS (
    SELECT DISTINCT ON (edge_name)
      edge_name, started_at, finished_at, status, error_message
    FROM public.cron_run_log
    ORDER BY edge_name, started_at DESC
  ),
  recent_stats AS (
    SELECT
      edge_name,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days') AS runs_7d,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days' AND status = 'failed') AS failed_7d
    FROM public.cron_run_log
    GROUP BY edge_name
  ),
  last_3 AS (
    SELECT edge_name,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed_in_last_3
    FROM (
      SELECT edge_name, status,
        ROW_NUMBER() OVER (PARTITION BY edge_name ORDER BY started_at DESC) AS rn
      FROM public.cron_run_log
      WHERE finished_at IS NOT NULL
    ) t
    WHERE rn <= 3
    GROUP BY edge_name
  )
  SELECT jsonb_agg(jsonb_build_object(
    'edge_name', c.edge_name,
    'label', c.label,
    'expected_interval_min', c.expected_interval_min,
    'last_started_at', lr.started_at,
    'last_finished_at', lr.finished_at,
    'last_status', lr.status,
    'last_error', lr.error_message,
    'runs_7d', COALESCE(rs.runs_7d, 0),
    'failed_7d', COALESCE(rs.failed_7d, 0),
    'failed_in_last_3', COALESCE(l3.failed_in_last_3, 0),
    'is_stale', (lr.started_at IS NULL OR lr.started_at < now() - (c.expected_interval_min * 2 || ' minutes')::interval)
  ) ORDER BY c.label)
  INTO result
  FROM crons c
  LEFT JOIN last_runs lr ON lr.edge_name = c.edge_name
  LEFT JOIN recent_stats rs ON rs.edge_name = c.edge_name
  LEFT JOIN last_3 l3 ON l3.edge_name = c.edge_name;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;
