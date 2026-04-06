-- Drop and recreate the view with correct columns
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  role,
  first_name,
  last_name,
  city,
  avatar_url,
  bio,
  profile_completion,
  is_founder,
  completed_sits_count,
  identity_verified,
  available_for_help,
  created_at
FROM public.profiles;

-- Grant anon access to the view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;
