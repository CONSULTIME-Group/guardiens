CREATE OR REPLACE FUNCTION public.get_sit_application_counts(p_sit_id uuid)
RETURNS TABLE(app_count integer, pending_app_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_can_view boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.sits s
    WHERE s.id = p_sit_id
      AND (
        s.status IN ('published', 'confirmed', 'completed')
        OR s.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  ) INTO v_can_view;

  IF NOT COALESCE(v_can_view, false) THEN
    RETURN QUERY SELECT 0::integer, 0::integer;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE a.status NOT IN ('rejected', 'cancelled'))::integer AS app_count,
    COUNT(*) FILTER (WHERE a.status IN ('pending', 'viewed', 'discussing'))::integer AS pending_app_count
  FROM public.applications a
  WHERE a.sit_id = p_sit_id;
END;
$$;