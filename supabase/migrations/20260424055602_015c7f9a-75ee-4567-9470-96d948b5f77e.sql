-- The public_profiles view is meant to expose ONLY non-sensitive fields
-- (first name, city, postal code, avatar, bio, badges) of active members.
-- It must be readable by all authenticated users so they can see other members
-- in search, dashboards, profile cards, etc. Sensitive fields (email, phone,
-- last_name, address, birthdate, etc.) stay protected by the strict RLS on
-- the underlying profiles table.
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT
  id,
  first_name,
  city,
  avatar_url,
  bio,
  completed_sits_count,
  identity_verified,
  is_founder,
  postal_code
FROM public.profiles
WHERE account_status = 'active';

-- Grant explicit read access to authenticated and anon users.
-- The view runs with definer rights (default) so it bypasses the strict
-- profiles RLS, but only ever returns the safe whitelisted columns above.
GRANT SELECT ON public.public_profiles TO authenticated, anon;