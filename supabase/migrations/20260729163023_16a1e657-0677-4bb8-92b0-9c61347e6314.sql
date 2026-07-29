DROP VIEW IF EXISTS public.public_profiles;

-- Confidentialité : n'exposer QUE latitude_approx / longitude_approx (arrondi 2 décimales, environ 1,1 km). Ne jamais ajouter latitude / longitude brutes, la vue est lisible par le rôle anon.
CREATE VIEW public.public_profiles AS
SELECT id,
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
    round(latitude::numeric, 2)::double precision AS latitude_approx,
    round(longitude::numeric, 2)::double precision AS longitude_approx,
    available_for_help,
    skill_categories,
    custom_skills,
    role,
    pro_status,
    pro_specialty,
    last_seen_at
   FROM profiles
  WHERE account_status = 'active'::text AND first_name IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;