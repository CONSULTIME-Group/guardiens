
-- Nettoyage préalable si les jobs existent déjà (idempotent)
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'auto-transition-sits',
  'send-sit-reminders',
  'send-rappel-j7',
  'send-rappel-j48',
  'send-avis-j1',
  'send-avis-j5'
);

-- pg_cron s'exécute en UTC. Choix des heures :
-- - 08h Paris (CEST été / CET hiver) ≈ 06h UTC été, 07h UTC hiver
--   → planifié à 06h UTC : correct en été, décalé à 07h Paris en hiver (acceptable)
-- - 09h Paris ≈ 07h UTC été
-- Tous les jobs authentifiés en service_role via vault.

-- 1. Transitions de statut : toutes les heures
SELECT cron.schedule(
  'auto-transition-sits',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/auto-transition-sits',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2a. Rappels in-app avant garde et notifications d'avis post-garde : 06h UTC (~08h Paris)
SELECT cron.schedule(
  'send-sit-reminders',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-sit-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2b. Rappel email J-7 (complémentaire, canal email) : 06h05 UTC
SELECT cron.schedule(
  'send-rappel-j7',
  '5 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-rappel-j7',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2c. Rappel email J-48h : 06h10 UTC
SELECT cron.schedule(
  'send-rappel-j48',
  '10 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-rappel-j48',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3. Emails avis J+1 : 07h UTC (~09h Paris)
SELECT cron.schedule(
  'send-avis-j1',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-avis-j1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4. Emails avis J+5 (relance unique) : 07h15 UTC (~09h15 Paris)
SELECT cron.schedule(
  'send-avis-j5',
  '15 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-avis-j5',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Étend admin_cron_health pour surveiller ces 6 nouveaux jobs
CREATE OR REPLACE FUNCTION public.admin_cron_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
      ('send-avis-j5', 1440, 'Email relance avis J+5')
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
    'age_minutes', CASE WHEN lr.started_at IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (now() - lr.started_at))/60 END,
    'runs_7d', COALESCE(rs.runs_7d, 0),
    'failed_7d', COALESCE(rs.failed_7d, 0),
    'failed_in_last_3', COALESCE(l3.failed_in_last_3, 0),
    'severity', CASE
      WHEN lr.started_at IS NULL THEN 'info'
      WHEN COALESCE(l3.failed_in_last_3, 0) >= 3 THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (now() - lr.started_at))/60 > c.expected_interval_min * 2 THEN 'critical'
      WHEN COALESCE(rs.failed_7d, 0) > 0 THEN 'warning'
      ELSE 'info'
    END
  ) ORDER BY c.edge_name)
  INTO result
  FROM crons c
  LEFT JOIN last_runs lr USING (edge_name)
  LEFT JOIN recent_stats rs USING (edge_name)
  LEFT JOIN last_3 l3 USING (edge_name);

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
