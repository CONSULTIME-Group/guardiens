
-- Chantier A Phase 2 : worker pgmq derrière un flag pour l'emailing de masse.
-- Défaut = false = ancien chemin synchrone inchangé.

-- 1. Files pgmq dédiées
DO $$ BEGIN PERFORM pgmq.create('mass_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('mass_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Flag runtime sur email_send_state (row id=1 déjà existante)
ALTER TABLE public.email_send_state
  ADD COLUMN IF NOT EXISTS mass_email_use_queue boolean NOT NULL DEFAULT false;

-- 3. Extensions de statuts + traçabilité sur mass_email_sends
ALTER TABLE public.mass_email_sends
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

-- status est un TEXT libre → aucune contrainte à modifier pour autoriser
-- 'queued' | 'sending' | 'sent' | 'failed' | 'suppressed' | 'skipped'.

CREATE INDEX IF NOT EXISTS idx_mass_email_sends_campaign_status
  ON public.mass_email_sends (mass_email_id, status);

-- 4. Compteurs sur mass_emails (status reste text libre → 'enqueuing' | 'cancelled' | 'done' etc. OK)
ALTER TABLE public.mass_emails
  ADD COLUMN IF NOT EXISTS enqueued_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_count     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count   int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_count  int NOT NULL DEFAULT 0;

-- 5. Wrapper de purge pgmq (utilisé par cancel-mass-email), service_role uniquement
CREATE OR REPLACE FUNCTION public.purge_email_queue(queue_name TEXT)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE purged BIGINT;
BEGIN
  SELECT pgmq.purge_queue(queue_name) INTO purged;
  RETURN purged;
EXCEPTION WHEN undefined_table THEN
  RETURN 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_email_queue(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.purge_email_queue(TEXT) TO service_role;

-- 6. Cron worker toutes les 30 s (pg_cron supporte l'intervalle sub-minute)
SELECT cron.unschedule('process-mass-email-queue')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-mass-email-queue');

SELECT cron.schedule(
  'process-mass-email-queue',
  '30 seconds',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/process-mass-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
