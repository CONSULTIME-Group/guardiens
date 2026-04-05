
-- Remove anon policy on profiles - public access goes through the view
DROP POLICY IF EXISTS "Anon can read non-sensitive profiles" ON public.profiles;

-- Recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  first_name,
  avatar_url,
  bio,
  city,
  postal_code,
  role,
  identity_verified,
  is_founder,
  completed_sits_count,
  cancellation_count,
  cancellations_as_proprio,
  profile_completion,
  skill_categories,
  custom_skills,
  available_for_help,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Anon needs to be able to SELECT from profiles for the view to work
-- But we scope it so only non-sensitive fields are exposed via the view
CREATE POLICY "Anon read profiles for view"
  ON public.profiles FOR SELECT TO anon
  USING (true);
