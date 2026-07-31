DROP VIEW IF EXISTS public.sitter_profiles_affinity;

CREATE VIEW public.sitter_profiles_affinity AS
SELECT
  user_id,
  experience_years,
  life_pace,
  languages,
  interests,
  work_during_sit,
  sensitivities,
  animal_types,
  sitter_type,
  travels_with_children,
  travels_with_own_animals
FROM public.sitter_profiles;

REVOKE ALL ON public.sitter_profiles_affinity FROM anon;
GRANT SELECT ON public.sitter_profiles_affinity TO authenticated;
GRANT ALL ON public.sitter_profiles_affinity TO service_role;