-- Lot SC5, « Une autre passion ? » (10/11/2026, suite de l'arène
-- claude/arene/2026-11-10-score-completion, validé par Jérémie : « ok je suis
-- d'accord avec tout go »).
--
-- Constat : 17 centres d'intérêt au choix, aucun champ libre. Le lot ajoute
-- huit choix à la liste et deux passions en texte libre, affichées sur la
-- fiche, hors calcul d'affinité (le moteur ne lit pas cette colonne).
--
-- Colonnes ajoutées vides par défaut : aucune donnée existante ne change.
-- Les deux vues publiques repartent de pg_get_viewdef en production
-- (10/11/2026) et gagnent la colonne en dernier, droits et filtres inchangés.
-- À appliquer avant la publication du front qui l'écrit.
-- Repère : sc5_autres_passions (contrat de production).

CREATE OR REPLACE FUNCTION public.valid_other_passions(p text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT cardinality(p) <= 2
     AND coalesce(bool_and(char_length(btrim(x)) BETWEEN 1 AND 30), true)
  FROM unnest(p) AS x
$$;

ALTER TABLE public.sitter_profiles
  ADD COLUMN IF NOT EXISTS other_passions text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS other_passions text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.sitter_profiles
  DROP CONSTRAINT IF EXISTS sitter_profiles_other_passions_check,
  ADD CONSTRAINT sitter_profiles_other_passions_check CHECK (public.valid_other_passions(other_passions));
ALTER TABLE public.owner_profiles
  DROP CONSTRAINT IF EXISTS owner_profiles_other_passions_check,
  ADD CONSTRAINT owner_profiles_other_passions_check CHECK (public.valid_other_passions(other_passions));

COMMENT ON COLUMN public.sitter_profiles.other_passions IS
  'Autres passions en texte libre (lot SC5, 10/11/2026) : deux au plus, 30 caractères chacune, affichées sur la fiche, hors calcul d''affinité. Repère : sc5_autres_passions.';
COMMENT ON COLUMN public.owner_profiles.other_passions IS
  'Autres passions en texte libre (lot SC5, 10/11/2026) : deux au plus, 30 caractères chacune, affichées sur la fiche, hors calcul d''affinité. Repère : sc5_autres_passions.';

CREATE OR REPLACE VIEW public.public_sitter_profiles AS
 SELECT s.user_id,
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
    s.life_pace,
    s.meeting_preference,
    s.travel_zones,
    s.guard_experience,
    s.other_passions
   FROM sitter_profiles s
     JOIN profiles p ON p.id = s.user_id
     LEFT JOIN notification_preferences np ON np.user_id = s.user_id
  WHERE p.account_status = 'active'::text AND p.first_name IS NOT NULL AND
        CASE
            WHEN COALESCE(np.profile_visibility, 'all'::text) = 'verified'::text THEN can_view_restricted_profile(s.user_id)
            ELSE true
        END;

CREATE OR REPLACE VIEW public.public_owner_profiles AS
 SELECT o.user_id,
    o.welcome_notes,
    o.environments,
    o.competences,
    o.competences_disponible,
    o.preferred_sitter_types,
    o.home_ambiance,
    o.languages,
    o.interests,
    o.life_pace,
    o.presence_expected,
    o.created_at,
    o.other_passions
   FROM owner_profiles o
     JOIN profiles p ON p.id = o.user_id
     LEFT JOIN notification_preferences np ON np.user_id = o.user_id
  WHERE o.user_id = auth.uid() OR p.account_status = 'active'::text AND
        CASE
            WHEN COALESCE(np.profile_visibility, 'all'::text) = 'verified'::text THEN can_view_restricted_profile(o.user_id)
            ELSE true
        END;
