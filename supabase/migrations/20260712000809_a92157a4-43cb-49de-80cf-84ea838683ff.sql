SELECT cron.schedule(
  'nudge-sitter-dormant',
  '0 11 * * 1',
  $$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/nudge-sitter-dormant',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'nudge-verification-stale',
  '0 9 * * 2',
  $$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/nudge-verification-stale',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'nudge-affinity-onboarding',
  '0 18 * * *',
  $$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/nudge-affinity-onboarding',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);