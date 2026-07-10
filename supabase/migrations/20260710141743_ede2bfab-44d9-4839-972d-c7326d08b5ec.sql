
-- 1. Heartbeat du worker process-email-queue
ALTER TABLE public.email_send_state
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

-- 2. Fonction SECURITY DEFINER pour interroger pgmq (schéma non exposé via PostgREST)
CREATE OR REPLACE FUNCTION public.get_email_pipeline_health()
RETURNS TABLE (
  last_run_at              timestamptz,
  last_run_age_seconds     numeric,
  oldest_pending_age_seconds numeric,
  stuck_rate_limit         boolean,
  retry_after_until        timestamptz,
  dlq_last_hour            bigint,
  failure_rate_1h          numeric,
  attempts_1h              bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  _oldest timestamptz;
  _last_run timestamptz;
  _retry_until timestamptz;
  _sent bigint := 0;
  _failed bigint := 0;
  _dlq bigint := 0;
BEGIN
  SELECT s.last_run_at, s.retry_after_until
    INTO _last_run, _retry_until
    FROM public.email_send_state s WHERE s.id = 1;

  -- Age du plus vieux message pending sur les 2 files
  BEGIN
    SELECT MIN(enqueued_at) INTO _oldest FROM (
      SELECT enqueued_at FROM pgmq.q_auth_emails
      UNION ALL
      SELECT enqueued_at FROM pgmq.q_transactional_emails
    ) q;
  EXCEPTION WHEN undefined_table THEN
    _oldest := NULL;
  END;

  SELECT
    COUNT(*) FILTER (WHERE status = 'sent'),
    COUNT(*) FILTER (WHERE status IN ('failed','rate_limited')),
    COUNT(*) FILTER (WHERE status = 'dlq')
  INTO _sent, _failed, _dlq
  FROM public.email_send_log
  WHERE created_at >= now() - interval '1 hour';

  last_run_at := _last_run;
  last_run_age_seconds := CASE WHEN _last_run IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (now() - _last_run)) END;
  oldest_pending_age_seconds := CASE WHEN _oldest IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (now() - _oldest)) END;
  stuck_rate_limit := (_retry_until IS NOT NULL AND _retry_until > now() + interval '30 minutes');
  retry_after_until := _retry_until;
  dlq_last_hour := _dlq;
  attempts_1h := _sent + _failed;
  failure_rate_1h := CASE WHEN (_sent + _failed) = 0 THEN 0
    ELSE (_failed::numeric / (_sent + _failed)::numeric) END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_email_pipeline_health() FROM public;
GRANT EXECUTE ON FUNCTION public.get_email_pipeline_health() TO authenticated, service_role;

-- Vue de commodité
CREATE OR REPLACE VIEW public.v_email_pipeline_health AS
  SELECT * FROM public.get_email_pipeline_health();

REVOKE ALL ON public.v_email_pipeline_health FROM public, anon;
GRANT SELECT ON public.v_email_pipeline_health TO authenticated, service_role;

-- 3. Cron watchdog pipeline auth toutes les 5 minutes
--    Même mécanisme que mass-email-watchdog (pg_cron + net.http_post + vault).
SELECT cron.unschedule('email-pipeline-watchdog')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-pipeline-watchdog');

SELECT cron.schedule(
  'email-pipeline-watchdog',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/email-pipeline-watchdog',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
