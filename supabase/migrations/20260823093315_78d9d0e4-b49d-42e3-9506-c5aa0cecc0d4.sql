DROP VIEW public.public_sitter_profiles;

CREATE VIEW public.public_sitter_profiles AS
SELECT
  s.user_id,
  s.motivation,
  s.sitter_type,
  s.accompanied_by,
  s.lifestyle,
  s.animal_types,
  s.has_vehicle,
  s.has_license,
  s.geographic_radius,
  s.min_stay_duration,
  s.is_available,
  s.competences,
  s.special_animal_skills,
  s.preferred_frequency,
  s.min_notice,
  s.preferred_environments,
  s.farm_animals_ok,
  s.own_animals,
  s.reply_median_minutes,
  s.travels_with_children,
  s.travels_with_own_animals,
  s.work_during_sit,
  s.availability_during,
  s.experience_years,
  s.languages,
  s.interests,
  s.life_pace
FROM sitter_profiles s
JOIN profiles p ON p.id = s.user_id
WHERE p.profile_completion >= 40;

GRANT SELECT ON public.public_sitter_profiles TO anon, authenticated;
GRANT ALL ON public.public_sitter_profiles TO service_role;

COMMENT ON VIEW public.public_sitter_profiles IS
  'Fiche publique gardien (seuil complétude 40). Expose TOUT ce que le moteur d''affinité score (décision du 23/08/2026 : symétrie avec public_owner_profiles), SAUF sensitivities (donnée de santé, signalée par le frein du moteur au moment de la candidature). vehicle_type retiré : champ mort (3/1037, jamais scoré, doctrine règle 6). Verrou : src/lib/__tests__/public-views-affinity-symmetry.test.ts.';

NOTIFY pgrst, 'reload schema';