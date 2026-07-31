DROP VIEW IF EXISTS public.public_sitter_profiles;
CREATE VIEW public.public_sitter_profiles AS
SELECT s.user_id, s.motivation, s.sitter_type, s.accompanied_by, s.lifestyle, s.animal_types,
       s.has_vehicle, s.geographic_radius, s.min_duration, s.is_available, s.competences,
       s.preferred_frequency, s.min_notice, s.preferred_environments, s.farm_animals_ok,
       s.own_animals, s.reply_median_minutes, s.travels_with_children, s.travels_with_own_animals
FROM public.sitter_profiles s
JOIN public.profiles p ON p.id = s.user_id
WHERE p.profile_completion >= 40;
GRANT SELECT ON public.public_sitter_profiles TO anon, authenticated;
GRANT ALL ON public.public_sitter_profiles TO service_role;