
-- 1. Unicité (campagne, destinataire) pour idempotence du tracking
--    Dédupliquer d'abord les éventuels doublons existants avant de créer la contrainte.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY mass_email_id, recipient_email
           ORDER BY sent_at ASC, id ASC
         ) AS rn
  FROM public.mass_email_sends
)
DELETE FROM public.mass_email_sends s
USING ranked r
WHERE s.id = r.id AND r.rn > 1;

ALTER TABLE public.mass_email_sends
  ADD CONSTRAINT mass_email_sends_campaign_recipient_key
  UNIQUE (mass_email_id, recipient_email);

-- 2. Colonnes de surveillance et fingerprint anti double-envoi sur mass_emails
ALTER TABLE public.mass_emails
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at    timestamptz,
  ADD COLUMN IF NOT EXISTS dedupe_key   text;

-- Index sur dedupe_key pour lookup rapide (fenêtre 5 min)
CREATE INDEX IF NOT EXISTS idx_mass_emails_dedupe_key_created
  ON public.mass_emails (dedupe_key, created_at DESC)
  WHERE dedupe_key IS NOT NULL;

-- Index pour le watchdog (campagnes actives à vérifier)
CREATE INDEX IF NOT EXISTS idx_mass_emails_status_heartbeat
  ON public.mass_emails (status, heartbeat_at)
  WHERE status = 'sending';

-- Note : `status` est un TEXT libre, aucun enum/CHECK à modifier pour autoriser 'paused'.

-- 3. Watchdog cron — toutes les 5 minutes
--    Réutilise le même mécanisme que les autres crons du projet (pg_cron + net.http_post
--    + vault secret `email_queue_service_role_key`).
SELECT cron.unschedule('mass-email-watchdog')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mass-email-watchdog');

SELECT cron.schedule(
  'mass-email-watchdog',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/mass-email-watchdog',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
