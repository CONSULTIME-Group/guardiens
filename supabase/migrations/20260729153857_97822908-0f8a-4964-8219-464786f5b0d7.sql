CREATE POLICY "sits_admin_select"
ON public.sits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

SELECT cron.alter_job(
  job_id := 60,
  command := $cmd$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-sit-draft-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

SELECT cron.alter_job(
  job_id := 16,
  command := $cmd$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/relance-cp-manquant',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cmd$
);