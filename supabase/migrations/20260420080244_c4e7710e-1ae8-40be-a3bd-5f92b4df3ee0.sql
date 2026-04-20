-- 1) Présence : last_seen_at sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at DESC);

-- 2) Relance : reminder_sent_at sur conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_conversations_reminder
  ON public.conversations(reminder_sent_at, context_type, last_message_at);

-- 3) Backfill : tous les owners actuels acceptent par défaut les pitches (pour ne pas casser l'existant)
UPDATE public.owner_profiles
SET accept_unsolicited_pitches = true
WHERE accept_unsolicited_pitches IS NULL OR accept_unsolicited_pitches = false;

-- 4) RPC : marquer la présence
CREATE OR REPLACE FUNCTION public.mark_user_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
  SET last_seen_at = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_user_seen() TO authenticated;

-- 5) Cron job pour relances quotidiennes (10h UTC = 11h Paris hiver / 12h été)
-- Supprime ancien job s'il existe
DO $$
BEGIN
  PERFORM cron.unschedule('messaging-reminders-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'messaging-reminders-daily');
EXCEPTION WHEN others THEN NULL;
END $$;

SELECT cron.schedule(
  'messaging-reminders-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-message-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);