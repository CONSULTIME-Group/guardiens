-- Limit queue management to the existing service-role callers.
-- Keep an exact ACL snapshot before changing privileges.
DO $migration$
DECLARE
  signatures text[] := ARRAY[
    'public.purge_email_queue(text)',
    'public.read_email_batch(text,integer,integer)',
    'public.delete_email(text,bigint)',
    'public.move_to_dlq(text,text,bigint,jsonb)'
  ];
  signature text;
BEGIN
  FOREACH signature IN ARRAY signatures LOOP
    IF to_regprocedure(signature) IS NULL THEN
      RAISE EXCEPTION 'Missing expected queue RPC: %', signature;
    END IF;
  END LOOP;

  CREATE TABLE IF NOT EXISTS public._backup_email_queue_rpc_acl_20260918 AS
    SELECT p.oid::regprocedure::text AS signature,
           pg_get_userbyid(p.proowner) AS owner_role,
           p.proacl AS acl,
           now() AS captured_at
    FROM pg_proc p
    WHERE p.oid = ANY (signatures::regprocedure[]);
  ALTER TABLE public._backup_email_queue_rpc_acl_20260918 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_email_queue_rpc_acl_20260918 FROM PUBLIC, anon, authenticated;

  REVOKE EXECUTE ON FUNCTION
    public.purge_email_queue(text),
    public.read_email_batch(text, integer, integer),
    public.delete_email(text, bigint),
    public.move_to_dlq(text, text, bigint, jsonb)
    FROM PUBLIC, anon, authenticated;

  GRANT EXECUTE ON FUNCTION
    public.purge_email_queue(text),
    public.read_email_batch(text, integer, integer),
    public.delete_email(text, bigint),
    public.move_to_dlq(text, text, bigint, jsonb)
    TO service_role;

  FOREACH signature IN ARRAY signatures LOOP
    IF has_function_privilege('anon', signature, 'EXECUTE')
       OR has_function_privilege('authenticated', signature, 'EXECUTE')
       OR NOT has_function_privilege('service_role', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected queue RPC privileges after restriction: %', signature;
    END IF;
  END LOOP;
END;
$migration$;
