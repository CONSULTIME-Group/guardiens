-- Function to batch-increment cp_relance_count
CREATE OR REPLACE FUNCTION public.increment_cp_relance(user_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET cp_relance_count = COALESCE(cp_relance_count, 0) + 1,
      last_cp_relance_at = NOW()
  WHERE id = ANY(user_ids);
END;
$$;

-- Enable pg_net if not already
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily cron at 10h Paris (8h UTC in winter, 8h UTC in summer — use 8h as safe default)
SELECT cron.schedule(
  'relance-cp-manquant-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/relance-cp-manquant',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase_functions.anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);