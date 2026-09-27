-- 0029 : dates de la garde dans les avis publics (LEFT JOIN sits), et
-- préférence de rencontre exposée par la vue publique des gardiens.
DROP FUNCTION IF EXISTS public.public_profile_reviews(uuid);
CREATE FUNCTION public.public_profile_reviews(p_user_id uuid)
 RETURNS TABLE(
  id uuid, sit_id uuid, reviewer_id uuid, reviewee_id uuid, overall_rating integer, comment text,
  published boolean, created_at timestamptz, animal_care_rating integer, communication_rating integer,
  housing_respect_rating integer, reliability_rating integer, listing_accuracy_rating integer,
  welcome_rating integer, instructions_clarity_rating integer, housing_condition_rating integer,
  would_recommend boolean, review_type text, cancelled_by_role text, cancellation_reason text,
  cancellation_response text, response_status text, response_submitted_at timestamptz,
  moderation_status text, mission_id uuid, moderation_hidden_by uuid, moderation_hidden_at timestamptz,
  selected_badges text[], review_role text, sit_start_date date, sit_end_date date)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.sit_id, r.reviewer_id, r.reviewee_id, r.overall_rating, r.comment,
    r.published, r.created_at, r.animal_care_rating, r.communication_rating,
    r.housing_respect_rating, r.reliability_rating, r.listing_accuracy_rating,
    r.welcome_rating, r.instructions_clarity_rating, r.housing_condition_rating,
    r.would_recommend, r.review_type, r.cancelled_by_role, r.cancellation_reason,
    r.cancellation_response, r.response_status, r.response_submitted_at,
    r.moderation_status, r.mission_id, r.moderation_hidden_by, r.moderation_hidden_at,
    r.selected_badges::text[],
    CASE
      WHEN r.sit_id IS NULL THEN 'entraide'
      WHEN s.user_id = r.reviewee_id THEN 'proprio'
      ELSE 'garde'
    END AS review_role,
    s.start_date AS sit_start_date,
    s.end_date AS sit_end_date
  FROM public.reviews r
  LEFT JOIN public.sits s ON s.id = r.sit_id
  WHERE r.reviewee_id = p_user_id
    AND r.published = true
    AND r.moderation_status = 'valide'
    AND r.review_type IS DISTINCT FROM 'annulation'
  ORDER BY r.created_at DESC
$function$;

REVOKE EXECUTE ON FUNCTION public.public_profile_reviews(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_profile_reviews(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.public_sitter_profiles AS
 SELECT s.user_id, s.motivation, s.sitter_type, s.accompanied_by, s.lifestyle, s.animal_types,
    s.has_vehicle, s.has_license, s.geographic_radius, s.min_stay_duration, s.is_available,
    s.competences, s.special_animal_skills, s.preferred_frequency, s.min_notice,
    s.preferred_environments, s.farm_animals_ok, s.own_animals, s.reply_median_minutes,
    s.travels_with_children, s.travels_with_own_animals, s.work_during_sit, s.availability_during,
    s.experience_years, s.languages, s.interests, s.life_pace,
    s.meeting_preference
   FROM sitter_profiles s
     JOIN profiles p ON p.id = s.user_id
  WHERE p.profile_completion >= 40;