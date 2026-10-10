-- Décision Jérémie (10/10/2026) : un gardien est visible quel que soit son
-- taux de complétion (compte actif, prénom renseigné) ; il ne peut candidater
-- qu'à partir de 40 % inclus, contrôlé côté serveur.
-- Ancienne définition : identique avec « WHERE p.profile_completion >= 40 ».
CREATE OR REPLACE VIEW public.public_sitter_profiles AS
 SELECT s.user_id, s.motivation, s.sitter_type, s.accompanied_by, s.lifestyle, s.animal_types,
    s.has_vehicle, s.has_license, s.geographic_radius, s.min_stay_duration, s.is_available,
    s.competences, s.special_animal_skills, s.preferred_frequency, s.min_notice,
    s.preferred_environments, s.farm_animals_ok, s.own_animals, s.reply_median_minutes,
    s.travels_with_children, s.travels_with_own_animals, s.work_during_sit, s.availability_during,
    s.experience_years, s.languages, s.interests, s.life_pace, s.meeting_preference,
    s.travel_zones
   FROM sitter_profiles s
     JOIN profiles p ON p.id = s.user_id
  WHERE p.account_status = 'active' AND p.first_name IS NOT NULL;

COMMENT ON VIEW public.public_sitter_profiles IS
  'Fiche publique gardien : compte actif et prénom renseigné, sans seuil de complétion (décision 10/10/2026). Aucune donnée de santé, coordonnées exactes, email ou téléphone.';

CREATE OR REPLACE FUNCTION public.guard_application_min_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_completion integer;
BEGIN
  SELECT profile_completion INTO v_completion FROM public.profiles WHERE id = NEW.sitter_id;
  IF coalesce(v_completion, 0) < 40 THEN
    RAISE EXCEPTION 'PROFILE_INCOMPLETE: complétez votre profil (40 %% minimum) pour candidater'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_application_min_completion() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_application_min_completion ON public.applications;
CREATE TRIGGER trg_guard_application_min_completion
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_application_min_completion();