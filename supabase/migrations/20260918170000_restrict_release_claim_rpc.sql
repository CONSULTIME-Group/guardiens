-- Notification workers use service-role clients to release failed claims.
-- Restrict only the three-argument overload; preserve the legacy overload.
DO $migration$
BEGIN
  IF to_regprocedure('public.release_sit_notification(uuid, date, text)') IS NULL THEN
    RAISE EXCEPTION 'Missing notification release RPC';
  END IF;

  CREATE TABLE IF NOT EXISTS public._backup_release_claim_rpc_20260918 AS
    SELECT p.oid::regprocedure::text AS signature,
           pg_get_functiondef(p.oid) AS definition,
           p.proacl AS acl,
           now() AS captured_at
    FROM pg_proc p
    WHERE p.oid = 'public.release_sit_notification(uuid, date, text)'::regprocedure;
  ALTER TABLE public._backup_release_claim_rpc_20260918 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_release_claim_rpc_20260918 FROM PUBLIC, anon, authenticated;

  REVOKE EXECUTE ON FUNCTION public.release_sit_notification(uuid, date, text)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.release_sit_notification(uuid, date, text)
    TO service_role;

  IF has_function_privilege('anon', 'public.release_sit_notification(uuid, date, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.release_sit_notification(uuid, date, text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.release_sit_notification(uuid, date, text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Unexpected notification release RPC privileges';
  END IF;
END;
$migration$;
