
-- 1. Fonction de détection
CREATE OR REPLACE FUNCTION public.detect_pending_applications()
RETURNS TABLE (
  application_id uuid,
  sit_id uuid,
  sit_title text,
  sitter_id uuid,
  sitter_first_name text,
  owner_id uuid,
  owner_first_name text,
  owner_email text,
  hours_since_created integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.sit_id,
    s.title,
    a.sitter_id,
    sitter.first_name,
    s.user_id,
    owner.first_name,
    owner.email,
    EXTRACT(EPOCH FROM (now() - a.created_at))::integer / 3600
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  JOIN profiles sitter ON sitter.id = a.sitter_id
  JOIN profiles owner ON owner.id = s.user_id
  WHERE a.status = 'pending'
    AND a.created_at < now() - interval '48 hours'
    AND owner.email IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.detect_pending_applications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_pending_applications() TO service_role;

-- 2. Trigger d'auto-résolution
CREATE OR REPLACE FUNCTION public.resolve_pending_application_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    UPDATE public.admin_signals
    SET resolved_at = now(),
        action_taken = COALESCE(action_taken, 'auto_resolved')
    WHERE signal_type = 'pending_application'
      AND entity_id = NEW.id
      AND resolved_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_pending_application_signal ON public.applications;
CREATE TRIGGER trg_resolve_pending_application_signal
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_pending_application_signal();

-- 3. Cron 9h et 17h
SELECT cron.unschedule('nudge-owner-pending-application')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nudge-owner-pending-application');

SELECT cron.schedule(
  'nudge-owner-pending-application',
  '0 9,17 * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/nudge-owner-pending-application',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $cron$
);
