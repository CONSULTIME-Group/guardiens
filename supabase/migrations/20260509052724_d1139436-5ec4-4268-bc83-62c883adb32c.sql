CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(
  total_users bigint,
  total_missions bigint,
  total_pets bigint,
  total_properties bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles WHERE account_status IS DISTINCT FROM 'deleted')::bigint,
    (SELECT count(*) FROM public.small_missions)::bigint,
    (SELECT count(*) FROM public.pets)::bigint,
    (SELECT count(*) FROM public.properties)::bigint;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;