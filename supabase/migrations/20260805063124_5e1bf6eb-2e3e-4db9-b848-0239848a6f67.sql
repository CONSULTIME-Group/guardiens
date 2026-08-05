CREATE OR REPLACE FUNCTION public.report_contact_details_attempt(_context text, _kinds text[], _excerpt text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
  VALUES (
    'contact_details_in_public_content',
    'warning',
    'content',
    auth.uid(),
    jsonb_build_object(
      'context', left(coalesce(_context, 'unknown'), 60),
      'kinds', to_jsonb(coalesce(_kinds, ARRAY[]::text[])),
      'excerpt', left(coalesce(_excerpt, ''), 500)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.report_contact_details_attempt(text, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_contact_details_attempt(text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_contact_details_attempt(text, text[], text) TO service_role;