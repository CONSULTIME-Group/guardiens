-- Prepare cron authentication BEFORE deploying the three guarded functions.
-- Commands only: job IDs, schedules and active flags remain unchanged.
DO $migration$
DECLARE
  target record;
  target_job_id bigint;
  matching_jobs integer;
BEGIN
  IF (SELECT count(*) FROM vault.decrypted_secrets
      WHERE name = 'supabase_service_role_key' AND length(decrypted_secret) > 0) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one nonempty supabase_service_role_key in Vault';
  END IF;

  -- Preserve the exact previous commands before altering cron metadata.
  CREATE TABLE public._backup_cron_auth_20260918 AS
    SELECT jobid, jobname, schedule, active, command
    FROM cron.job
    WHERE jobname IN (
      'consume-seo-dirty-hourly',
      'detect-deploy-and-mark-dirty-10min',
      'send-weekly-nearby-digest'
    );
  ALTER TABLE public._backup_cron_auth_20260918 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_cron_auth_20260918 FROM PUBLIC, anon, authenticated;

  FOR target IN
    SELECT * FROM (VALUES
      ('consume-seo-dirty-hourly', 'consume-seo-dirty'),
      ('detect-deploy-and-mark-dirty-10min', 'detect-deploy-and-mark-dirty'),
      ('send-weekly-nearby-digest', 'send-weekly-nearby-digest')
    ) AS targets(job_name, function_name)
  LOOP
    SELECT count(*), min(jobid) INTO matching_jobs, target_job_id
    FROM cron.job WHERE jobname = target.job_name;
    IF matching_jobs <> 1 THEN
      RAISE EXCEPTION 'Expected exactly one cron named %, got %', target.job_name, matching_jobs;
    END IF;

    PERFORM cron.alter_job(
      job_id := target_job_id,
      command := format($command$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
              SELECT decrypted_secret FROM vault.decrypted_secrets
              WHERE name = 'supabase_service_role_key' LIMIT 1
            )
          ),
          body := jsonb_build_object('time', now())
        ) AS request_id;
      $command$, 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/' || target.function_name)
    );
  END LOOP;
END;
$migration$;
