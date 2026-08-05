CREATE OR REPLACE FUNCTION public.get_member_display(_ids uuid[])
RETURNS TABLE (id uuid, first_name text, avatar_url text, is_deleted boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    CASE WHEN p.account_status = 'deleted' THEN 'Membre supprimé' ELSE p.first_name END,
    CASE WHEN p.account_status = 'deleted' THEN NULL ELSE p.avatar_url END,
    (p.account_status = 'deleted')
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_member_display(uuid[]) TO anon, authenticated, service_role;