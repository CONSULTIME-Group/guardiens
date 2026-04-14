
-- Drop the old cron job that uses anon_key
SELECT cron.unschedule('relance-cp-manquant-daily');

-- Recreate with service_role key from vault
SELECT cron.schedule(
  'relance-cp-manquant-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/relance-cp-manquant',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
