-- Deploy send-transactional-email reference support before this migration.
-- Existing browser clients keep the same RPC signature and string contract.
DO $migration$
BEGIN
  IF to_regprocedure('public.get_user_email_for_notification(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Missing notification recipient RPC';
  END IF;

  CREATE TABLE IF NOT EXISTS public._backup_notification_email_rpc_20260918 AS
    SELECT p.oid::regprocedure::text AS signature,
           pg_get_functiondef(p.oid) AS definition,
           p.proacl AS acl,
           now() AS captured_at
    FROM pg_proc p
    WHERE p.oid = 'public.get_user_email_for_notification(uuid)'::regprocedure;
  ALTER TABLE public._backup_notification_email_rpc_20260918 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_notification_email_rpc_20260918 FROM PUBLIC, anon, authenticated;

  EXECUTE $definition$
CREATE OR REPLACE FUNCTION public.get_user_email_for_notification(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN (SELECT email FROM auth.users WHERE id = target_user_id LIMIT 1);
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Compatibility reference only: no address lookup or membership disclosure.
  RETURN 'user-' || target_user_id::text || '@notification.guardiens.invalid';
END;
$function$;
$definition$;

  REVOKE EXECUTE ON FUNCTION public.get_user_email_for_notification(uuid) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.get_user_email_for_notification(uuid) TO authenticated, service_role;
END;
$migration$;
