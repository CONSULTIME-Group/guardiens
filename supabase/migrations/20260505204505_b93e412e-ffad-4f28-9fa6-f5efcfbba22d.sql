
DO $$
DECLARE
  r record;
  whitelist text[] := ARRAY['log_client_error','find_duplicate_gmail_account','has_role'];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND NOT (p.proname = ANY(whitelist))
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, PUBLIC', r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip %(%): %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
END $$;
