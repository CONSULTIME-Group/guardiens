DROP VIEW IF EXISTS public.public_sitter_profiles;

CREATE VIEW public.public_sitter_profiles AS
SELECT
  user_id,
  motivation,
  sitter_type,
  accompanied_by,
  lifestyle,
  animal_types,
  has_vehicle,
  geographic_radius,
  min_duration,
  is_available,
  competences,
  preferred_frequency,
  min_notice,
  preferred_environments,
  farm_animals_ok,
  own_animals,
  reply_median_minutes,
  travels_with_children,
  travels_with_own_animals
FROM public.sitter_profiles;

GRANT SELECT ON public.public_sitter_profiles TO anon, authenticated;

DROP VIEW IF EXISTS public.sitter_profiles_affinity;

CREATE VIEW public.sitter_profiles_affinity AS
SELECT
  user_id,
  experience_years,
  life_pace,
  languages,
  interests,
  work_during_sit,
  sensitivities
FROM public.sitter_profiles;

REVOKE ALL ON public.sitter_profiles_affinity FROM anon;
GRANT SELECT ON public.sitter_profiles_affinity TO authenticated;