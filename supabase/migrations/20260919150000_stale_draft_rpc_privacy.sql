-- Appliqué via drizzle (voir drizzle/migrations) ou via SQL direct ; ne pas rejouer.
-- Applied after explicit GO on 2026-09-19 at 19:48 UTC.
-- Restrict the admin-only detector to server callers; retained as reviewed SQL.
-- Its body, signature, owner, SECURITY DEFINER, search_path and data stay intact.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
DO $guard$
BEGIN
  IF md5(pg_get_functiondef('public.detect_stale_drafts()'::regprocedure))
      <> 'a7fda54342876f1449ad6f207589e771' THEN
    RAISE EXCEPTION 'detect_stale_drafts changed since review; rebase required';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.detect_stale_drafts()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Missing service_role permission before migration; review required';
  END IF;
END;
$guard$;

REVOKE ALL ON FUNCTION public.detect_stale_drafts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_stale_drafts() TO service_role;

DO $verify$
BEGIN
  IF has_function_privilege('anon', 'public.detect_stale_drafts()', 'EXECUTE')
      OR has_function_privilege('authenticated', 'public.detect_stale_drafts()', 'EXECUTE')
      OR NOT has_function_privilege('service_role', 'public.detect_stale_drafts()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected effective permissions after revoke; transaction aborted';
  END IF;
END;
$verify$;
COMMIT;
