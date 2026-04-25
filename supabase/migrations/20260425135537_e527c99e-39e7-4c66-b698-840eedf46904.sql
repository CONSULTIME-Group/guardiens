CREATE OR REPLACE FUNCTION public.admin_get_recent_applications_activity(p_limit integer DEFAULT 5)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  sit_id uuid,
  sit_title text,
  sitter_first_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.created_at,
    a.sit_id,
    s.title AS sit_title,
    p.first_name AS sitter_first_name
  FROM public.applications a
  LEFT JOIN public.sits s ON s.id = a.sit_id
  LEFT JOIN public.profiles p ON p.id = a.sitter_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_recent_applications_activity(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_applications_activity(integer) TO authenticated;