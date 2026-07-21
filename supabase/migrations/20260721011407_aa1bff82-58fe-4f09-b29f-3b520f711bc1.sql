
CREATE OR REPLACE VIEW public.public_sitter_profiles AS
SELECT
  user_id, motivation, sitter_type, accompanied_by, smoker, availability_during,
  lifestyle, animal_types, experience_years, has_vehicle, geographic_radius,
  min_duration, max_duration, is_available, competences, min_stay_duration,
  preferred_frequency, min_notice, preferred_periods, preferred_environments,
  dog_sizes_accepted, farm_animals_ok, own_animals, guard_experience,
  reply_median_minutes, languages, bonus_skills, interests, life_pace,
  household_composition, special_animal_skills, travels_with_children,
  travels_with_own_animals, created_at
FROM public.sitter_profiles;

GRANT SELECT ON public.public_sitter_profiles TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_owner_profiles AS
SELECT
  user_id, welcome_notes, environments, competences, competences_disponible,
  preferred_sitter_types, home_ambiance, languages, interests, life_pace,
  presence_expected, created_at
FROM public.owner_profiles;

GRANT SELECT ON public.public_owner_profiles TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_emergency_sitter_profiles AS
SELECT user_id, is_active FROM public.emergency_sitter_profiles;

GRANT SELECT ON public.public_emergency_sitter_profiles TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_mission_feedbacks AS
SELECT id, receiver_id, positive, badge_key, comment, created_at
FROM public.mission_feedbacks;

GRANT SELECT ON public.public_mission_feedbacks TO anon, authenticated;

GRANT SELECT ON public.helper_recognition_stats TO anon;

CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO anon, authenticated;
