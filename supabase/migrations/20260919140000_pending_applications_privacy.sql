-- APPLIED after user instruction to finish, 2026-09-19 20:38 UTC. Do not replay.
-- Restrict the private pending-application detector to its existing server callers.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='15s';
DO $guard$ BEGIN
 IF md5(pg_get_functiondef('public.detect_pending_applications()'::regprocedure)) <> 'ebfa933ba8859a2f8c69e5d46b236962' THEN RAISE EXCEPTION 'Detector definition changed'; END IF;
 IF NOT has_function_privilege('service_role','public.detect_pending_applications()','EXECUTE') THEN RAISE EXCEPTION 'Missing server permission'; END IF;
END; $guard$;
REVOKE ALL ON FUNCTION public.detect_pending_applications() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.detect_pending_applications() TO service_role;
DO $verify$ BEGIN
 IF has_function_privilege('anon','public.detect_pending_applications()','EXECUTE') OR has_function_privilege('authenticated','public.detect_pending_applications()','EXECUTE') THEN RAISE EXCEPTION 'Public access persists'; END IF;
END; $verify$;
COMMIT;
