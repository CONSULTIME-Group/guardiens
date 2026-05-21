-- RPC publique exposant uniquement les champs auteur sûrs pour une mission
CREATE OR REPLACE FUNCTION public.get_mission_author_public(_mission_id uuid)
RETURNS TABLE (
  first_name text,
  avatar_url text,
  city text,
  postal_code text,
  identity_verified boolean,
  member_since timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.first_name,
    p.avatar_url,
    p.city,
    p.postal_code,
    p.identity_verified,
    p.created_at AS member_since
  FROM public.small_missions m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.id = _mission_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_mission_author_public(uuid) TO anon, authenticated;