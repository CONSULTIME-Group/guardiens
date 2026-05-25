DROP VIEW IF EXISTS public.public_profiles CASCADE;

CREATE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT
  id,
  first_name,
  city,
  avatar_url,
  bio,
  completed_sits_count,
  identity_verified,
  is_founder,
  postal_code,
  created_at,
  profile_completion,
  ROUND(latitude::numeric, 2)::double precision AS latitude_approx,
  ROUND(longitude::numeric, 2)::double precision AS longitude_approx,
  available_for_help,
  skill_categories,
  custom_skills
FROM public.profiles
WHERE account_status = 'active' AND first_name IS NOT NULL;

ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO anon, authenticated;