DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_email_pipeline_health'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END
$$;

DO $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['email_pipeline_health', 'v_email_pipeline_health']
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v AND c.relkind IN ('v', 'm')
    ) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', v);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', v);
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', v);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', v);

      IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v AND c.relkind = 'v'
      ) THEN
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v);
      END IF;
    END IF;
  END LOOP;
END
$$;