DROP FUNCTION IF EXISTS public.get_mission_author_public(uuid);
CREATE FUNCTION public.get_mission_author_public(_mission_id uuid)
 RETURNS TABLE(user_id uuid, first_name text, avatar_url text, city text, postal_code text, identity_verified boolean, member_since timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id AS user_id,
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
$function$;
REVOKE ALL ON FUNCTION public.get_mission_author_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mission_author_public(uuid) TO anon, authenticated;