
-- 1) Backfill articles.published_at
UPDATE public.articles
SET published_at = created_at
WHERE published = true
  AND published_at IS NULL;

-- 2) Trigger ensure_published_at
CREATE OR REPLACE FUNCTION public.ensure_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.published = true AND NEW.published_at IS NULL THEN
    NEW.published_at := COALESCE(
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.published_at ELSE NULL END,
      NEW.created_at,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_published_at ON public.articles;
CREATE TRIGGER trg_ensure_published_at
  BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_published_at();

-- 3) cron_run_log table
CREATE TABLE IF NOT EXISTS public.cron_run_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text CHECK (status IN ('success','failed','partial')),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text
);

GRANT SELECT ON public.cron_run_log TO authenticated;
GRANT ALL ON public.cron_run_log TO service_role;

ALTER TABLE public.cron_run_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read cron_run_log" ON public.cron_run_log;
CREATE POLICY "Admins can read cron_run_log"
  ON public.cron_run_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages cron_run_log" ON public.cron_run_log;
CREATE POLICY "Service role manages cron_run_log"
  ON public.cron_run_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cron_run_log_recent
  ON public.cron_run_log(edge_name, started_at DESC);

-- 4) admin_cron_health RPC
-- Config des crons connus (edge_name, intervalle attendu en minutes, libellé)
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
      ('nudge-verification-stale', 1440, 'Relance vérifications d''identité')
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

GRANT EXECUTE ON FUNCTION public.admin_cron_health() TO authenticated;

-- 5) pg_cron : flush-prerender-cache toutes les 15 minutes
SELECT cron.unschedule('flush-prerender-cache')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flush-prerender-cache');

SELECT cron.schedule(
  'flush-prerender-cache',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/flush-prerender-cache',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
