-- Lot SC2, « compétences bonus » rangées dans le savoir-faire (10/11/2026,
-- arène claude/arene/2026-11-10-score-completion, « ok go » de Jérémie sur
-- « Demander au bon moment », décisions 2, 3, 5 et 7).
--
-- Constat : sitter_profiles.bonus_skills (« Compétences bonus », 5 choix) est
-- rempli par 122 gardiens et lu par rien (ni calcul d'affinité, ni fiche, ni
-- fonction SQL). Les mêmes savoir-faire existent dans competences (coups de
-- main, jardin, savoirs) et dans special_animal_skills.
--
-- 1. Les valeurs rejoignent le vocabulaire existant, sans doublon (comparaison
--    sans casse) :
--      Ménage                   -> competences « Ménage occasionnel »
--      Cuisine                  -> competences « Cuisine »
--      Bricolage                -> competences « Bricolage »
--      Jardinage                -> competences « Tonte et entretien jardin »,
--                                  seulement pour qui n'a encore aucune
--                                  compétence de jardin (motifs de
--                                  src/lib/skills/categories.ts)
--      Premiers secours animaux -> special_animal_skills
--    skill_categories reçoit la catégorie dérivée (coups_de_main, competences,
--    jardin), comme le fait le formulaire à chaque enregistrement.
--    La colonne bonus_skills reste en place, valeurs conservées.
-- 2. Garde-fou : aucun score de complétion ne baisse. La transaction échoue au
--    premier score en baisse (contrainte de Jérémie : aucun gardien sous 40).
--    Attendu (simulation SELECT du 10/11/2026) : 103 fiches modifiées, 189 savoir-faire ajoutés,
--    15 « Premiers secours animaux », 10 « Tonte et entretien jardin » ; 23 gardiens
--    gagnent les 15 points du savoir-faire, 3 passent 40.
-- 3. Vue public_sitter_profiles : rattrapage de la définition en production
--    (sans seuil de complétion, décision du 10/10/2026, absente du dépôt) et
--    ajout de guard_experience (gardes réalisées) en dernière colonne.
-- Repère : sc2_competences_bonus (contrat de production).

BEGIN;

CREATE TEMP TABLE _sc2_before ON COMMIT DROP AS
  SELECT id, profile_completion FROM public.profiles;

WITH src AS (
  SELECT
    s.user_id,
    s.bonus_skills,
    coalesce(s.competences, '{}'::text[]) AS comp,
    coalesce(s.special_animal_skills, '{}'::text[]) AS special,
    coalesce(s.skill_categories, '{}'::text[]) AS cats,
    EXISTS (
      SELECT 1 FROM unnest(coalesce(s.competences, '{}'::text[])) c
      WHERE c ~* '(jardin|potager|horticulture|tonte|gazon|pelouse|haie|taille|[ée]lagage|arrosage|plante|fleur|massif|arbuste|piscine)'
    ) AS has_garden
  FROM public.sitter_profiles s
  WHERE coalesce(array_length(s.bonus_skills, 1), 0) > 0
),
adds AS (
  SELECT
    user_id, comp, special, cats,
    array_remove(ARRAY[
      CASE WHEN 'Ménage' = ANY(bonus_skills) THEN 'Ménage occasionnel' END,
      CASE WHEN 'Cuisine' = ANY(bonus_skills) THEN 'Cuisine' END,
      CASE WHEN 'Bricolage' = ANY(bonus_skills) THEN 'Bricolage' END,
      CASE WHEN 'Jardinage' = ANY(bonus_skills) AND NOT has_garden THEN 'Tonte et entretien jardin' END
    ], NULL) AS comp_add,
    CASE WHEN 'Premiers secours animaux' = ANY(bonus_skills)
              AND NOT ('Premiers secours animaux' = ANY(special))
         THEN ARRAY['Premiers secours animaux'] ELSE '{}'::text[] END AS special_add
  FROM src
),
merged AS (
  SELECT
    a.user_id,
    a.comp || ARRAY(
      SELECT x FROM unnest(a.comp_add) x
      WHERE NOT EXISTS (SELECT 1 FROM unnest(a.comp) c WHERE lower(c) = lower(x))
    ) AS new_comp,
    a.special || a.special_add AS new_special,
    a.cats
  FROM adds a
),
final AS (
  SELECT
    m.user_id, m.new_comp, m.new_special,
    ARRAY(
      SELECT DISTINCT k FROM (
        SELECT unnest(m.cats) AS k
        UNION ALL
        SELECT 'coups_de_main' WHERE EXISTS (SELECT 1 FROM unnest(m.new_comp) c WHERE c ~* '(m[ée]nage|bricolage)')
        UNION ALL
        SELECT 'competences' WHERE EXISTS (SELECT 1 FROM unnest(m.new_comp) c WHERE c ~* 'cuisine')
        UNION ALL
        SELECT 'jardin' WHERE EXISTS (SELECT 1 FROM unnest(m.new_comp) c WHERE c ~* '(jardin|tonte)')
      ) u ORDER BY k
    ) AS new_cats
  FROM merged m
)
UPDATE public.sitter_profiles s
SET competences = f.new_comp,
    special_animal_skills = f.new_special,
    skill_categories = f.new_cats
FROM final f
WHERE s.user_id = f.user_id
  AND (s.competences IS DISTINCT FROM f.new_comp
       OR s.special_animal_skills IS DISTINCT FROM f.new_special
       OR s.skill_categories IS DISTINCT FROM f.new_cats);

-- Le déclencheur trg_recalc_completion_sitter_profiles recalcule le score de
-- chaque fiche modifiée ; le contrôle porte sur l'ensemble des profils.
DO $$
DECLARE
  v_down integer;
BEGIN
  SELECT count(*) INTO v_down
  FROM public.profiles p
  JOIN _sc2_before b ON b.id = p.id
  WHERE p.profile_completion < b.profile_completion;
  IF v_down > 0 THEN
    RAISE EXCEPTION 'sc2_competences_bonus : % score(s) en baisse, migration annulée', v_down;
  END IF;
END
$$;

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
    s.guard_experience
   FROM ((public.sitter_profiles s
     JOIN public.profiles p ON ((p.id = s.user_id)))
     LEFT JOIN public.notification_preferences np ON ((np.user_id = s.user_id)))
  WHERE ((p.account_status = 'active'::text) AND (p.first_name IS NOT NULL) AND
        CASE
            WHEN (COALESCE(np.profile_visibility, 'all'::text) = 'verified'::text) THEN public.can_view_restricted_profile(s.user_id)
            ELSE true
        END);

COMMENT ON VIEW public.public_sitter_profiles IS
  'Fiche publique gardien : compte actif et prénom renseigné, sans seuil de complétion (décision 10/10/2026). Aucune donnée de santé, coordonnées exactes, email ou téléphone. Gardes réalisées (guard_experience) ajoutées le 10/11/2026 (lot SC2). Repère : sc2_competences_bonus.';

COMMIT;
