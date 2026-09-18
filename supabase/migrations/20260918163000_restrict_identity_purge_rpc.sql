-- The scheduled purge uses a service-role client. Public callers must not
-- enumerate identity document paths, account IDs or verification decisions.
DO $migration$
BEGIN
  IF to_regprocedure('public.list_identity_documents_to_purge(integer)') IS NULL THEN
    RAISE EXCEPTION 'Missing identity document purge RPC';
  END IF;

  CREATE TABLE IF NOT EXISTS public._backup_identity_purge_rpc_20260918 AS
    SELECT p.oid::regprocedure::text AS signature,
           pg_get_functiondef(p.oid) AS definition,
           p.proacl AS acl,
           now() AS captured_at
    FROM pg_proc p
    WHERE p.oid = 'public.list_identity_documents_to_purge(integer)'::regprocedure;
  ALTER TABLE public._backup_identity_purge_rpc_20260918 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_identity_purge_rpc_20260918 FROM PUBLIC, anon, authenticated;

  REVOKE EXECUTE ON FUNCTION public.list_identity_documents_to_purge(integer)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.list_identity_documents_to_purge(integer)
    TO service_role;

  IF has_function_privilege('anon', 'public.list_identity_documents_to_purge(integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.list_identity_documents_to_purge(integer)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.list_identity_documents_to_purge(integer)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Unexpected identity document purge RPC privileges';
  END IF;
END;
$migration$;
