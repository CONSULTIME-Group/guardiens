-- 1) GRANT EXECUTE on admin_get_sits_stats (was missing, causing 400)
REVOKE ALL ON FUNCTION public.admin_get_sits_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_sits_stats(uuid[]) TO authenticated;

-- 2) GRANT EXECUTE on admin_get_listings_stats (sanity, same pattern)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_get_listings_stats') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.admin_get_listings_stats(uuid[]) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_get_listings_stats(uuid[]) TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_get_listing_traffic_sources') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.admin_get_listing_traffic_sources(uuid, integer) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_get_listing_traffic_sources(uuid, integer) TO authenticated';
  END IF;
END $$;

-- 3) Recreate public_profiles view properly so anon/authenticated can SELECT
--    even though underlying profiles table is RLS-locked.
DROP VIEW IF EXISTS public.public_profiles CASCADE;
CREATE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT
  p.id,
  p.first_name,
  p.avatar_url,
  p.city,
  p.bio,
  p.is_founder,
  p.identity_verified,
  p.created_at
FROM public.profiles p
WHERE p.first_name IS NOT NULL;

ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO anon, authenticated;