-- Preference lookup is used by server-side email and token-unsubscribe handlers.
-- Direct public lookup by email must not expose member IDs or preferences.
DO $migration$
BEGIN
  IF to_regprocedure('public.get_email_preferences_by_email(text)') IS NULL THEN
    RAISE EXCEPTION 'Missing email preferences lookup RPC';
  END IF;

  CREATE TABLE IF NOT EXISTS public._backup_email_prefs_rpc_20260919 AS
    SELECT p.oid::regprocedure::text AS signature,
           pg_get_functiondef(p.oid) AS definition,
           p.proacl AS acl,
           now() AS captured_at
    FROM pg_proc p
    WHERE p.oid = 'public.get_email_preferences_by_email(text)'::regprocedure;
  ALTER TABLE public._backup_email_prefs_rpc_20260919 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_email_prefs_rpc_20260919 FROM PUBLIC, anon, authenticated;

  REVOKE EXECUTE ON FUNCTION public.get_email_preferences_by_email(text)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.get_email_preferences_by_email(text)
    TO service_role;

  IF has_function_privilege('anon', 'public.get_email_preferences_by_email(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.get_email_preferences_by_email(text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.get_email_preferences_by_email(text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Unexpected email preferences lookup privileges';
  END IF;
END;
$migration$;
