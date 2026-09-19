-- Claim statistics are written only by service-role notification workers.
-- Preserve the function body and keep a protected snapshot of its old ACL.
DO $migration$
BEGIN
  IF to_regprocedure('public.record_claim_outcome(text, integer, integer, jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Missing claim outcome RPC';
  END IF;

  CREATE TABLE IF NOT EXISTS public._backup_claim_outcome_rpc_20260919 AS
    SELECT p.oid::regprocedure::text AS signature,
           pg_get_functiondef(p.oid) AS definition,
           p.proacl AS acl,
           now() AS captured_at
    FROM pg_proc p
    WHERE p.oid = 'public.record_claim_outcome(text, integer, integer, jsonb)'::regprocedure;
  ALTER TABLE public._backup_claim_outcome_rpc_20260919 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_claim_outcome_rpc_20260919 FROM PUBLIC, anon, authenticated;

  REVOKE EXECUTE ON FUNCTION public.record_claim_outcome(text, integer, integer, jsonb)
    FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.record_claim_outcome(text, integer, integer, jsonb)
    TO service_role;

  IF has_function_privilege('anon', 'public.record_claim_outcome(text, integer, integer, jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.record_claim_outcome(text, integer, integer, jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.record_claim_outcome(text, integer, integer, jsonb)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Unexpected claim outcome RPC privileges';
  END IF;
END;
$migration$;
