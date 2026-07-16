-- Restrict geocode_cache and location_profiles reads: only edge functions (service_role) need them.
-- Clients call the corresponding edge functions, they don't query these tables directly.

DROP POLICY IF EXISTS "Anyone can read geocode cache" ON public.geocode_cache;
DROP POLICY IF EXISTS "Anyone can read location profiles" ON public.location_profiles;

-- Revoke Data API SELECT from anon/authenticated; service_role bypasses RLS.
REVOKE SELECT ON public.geocode_cache FROM anon, authenticated;
REVOKE SELECT ON public.location_profiles FROM anon, authenticated;