CREATE OR REPLACE FUNCTION public.admin_email_pipeline_health()
RETURNS SETOF public.v_email_pipeline_health
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_email_pipeline_health;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_email_pipeline_health() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_email_pipeline_health() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_email_pipeline_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_email_pipeline_health() TO service_role;

COMMENT ON FUNCTION public.admin_email_pipeline_health() IS 'Lot A2 (28/09/2026) : lecture admin de v_email_pipeline_health, la vue restant fermee aux comptes connectes.';