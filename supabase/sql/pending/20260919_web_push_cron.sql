-- Prepared activation only. Run after reviewed schema, VAPID and Edge deploys.
-- No inline secret. No immediate Edge invocation. No existing job changed.
DO $activation$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-web-push') THEN
    RAISE EXCEPTION 'push_cron_already_exists_review_before_change';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='supabase_service_role_key') THEN
    RAISE EXCEPTION 'push_service_key_missing';
  END IF;
  PERFORM cron.schedule('dispatch-web-push', '* * * * *', $job$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/dispatch-web-push',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name='supabase_service_role_key' LIMIT 1
        )
      ),
      body := '{"limit":5}'::jsonb,
      timeout_milliseconds := 50000
    );
  $job$);
END;
$activation$;

-- Immediate rollback of dispatch only, if needed and authorized:
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='dispatch-web-push';
-- Do not call the dispatcher as a deployment smoke test: it can send live push.
