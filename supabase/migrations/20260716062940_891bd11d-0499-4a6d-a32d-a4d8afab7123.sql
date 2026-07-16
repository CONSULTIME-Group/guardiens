DROP FUNCTION IF EXISTS public.admin_get_listing_applications(uuid);

CREATE OR REPLACE FUNCTION public.admin_get_listing_applications(p_sit_id uuid)
RETURNS TABLE(
  application_id uuid,
  sitter_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  message text,
  status text,
  viewed_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.sitter_id, p.first_name, p.last_name, p.avatar_url,
         a.message, a.status::text, a.viewed_at, a.created_at
  FROM public.applications a
  LEFT JOIN public.profiles p ON p.id = a.sitter_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND a.sit_id = p_sit_id
  ORDER BY a.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_listing_applications(uuid) TO authenticated;