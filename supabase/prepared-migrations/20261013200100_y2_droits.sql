-- Lot Y2 (13/10/2026) : droits d'accès, passe 3 de l'audit complet.
-- Définitions et droits relus en production le 13/10/2026 (lecture seule),
-- puis corrigés. À appliquer en une transaction (BEGIN ... COMMIT). Le
-- fichier est rejouable : IF EXISTS, CREATE OR REPLACE, DROP POLICY IF
-- EXISTS avant chaque CREATE POLICY. Aucune donnée n'est supprimée.
--
-- Cause commune des failles : Supabase accorde EXECUTE (et les droits de
-- table) explicitement à anon et authenticated. Un REVOKE ... FROM PUBLIC
-- ne retire donc rien. Chaque REVOKE de ce fichier vise PUBLIC, anon et
-- authenticated, puis un GRANT rend l'accès voulu.
--
-- Ordre : P3-01 à P3-03 (déjà appliqués), P3-04, P3-05, P3-06, P3-07,
-- P3-08, P3-09, P3-11, P3-12, P3-13, P3-14, P3-15, P3-16, P3-17, P3-18,
-- puis Y2-V1 (vues écrivables, constat ajouté pendant la correction).
-- P3-10 se corrige dans le code seul (lecture de public_pets).

-- =========================================================================
-- P3-01 à P3-03 : appliqué en base le 13/10/2026 à 18 h. Rejoué sans effet.
-- Emails de membres lisibles par anon ou tout membre, envoi d'emails
-- arbitraires par enqueue_email. Appelants : fonctions Edge en service_role.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.seasonal_nurture_plan(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seasonal_nurture_result(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mutual_aid_weekly_digest_plan(numeric, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_unconfirmed_sits(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_identity_orphan_documents() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_available_sitters_for_nudge(text, date, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seasonal_nurture_plan(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.seasonal_nurture_result(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutual_aid_weekly_digest_plan(numeric, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_unconfirmed_sits(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_identity_orphan_documents() TO service_role;
GRANT EXECUTE ON FUNCTION public.find_available_sitters_for_nudge(text, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;

-- =========================================================================
-- P3-04 : fonctions de service ouvertes à anon ou à tout membre.
-- Appelants vérifiés (src, supabase/functions, cron.job, fonctions SQL) :
--   detect_stale_sits : nudge-owner-no-applications (service_role) ;
--   get_owner_top_3_sitters : send-onboarding-j1 (service_role) ;
--   auto_archive_past_sits : cron auto-archive-past-sits (postgres) ;
--   mission_audience : enqueue_helpers_for_new_mission et
--     count_mission_notification_audience (SECURITY DEFINER) ;
--   email_delivery_rate_by_template : detect_low_email_delivery (DEFINER) ;
--   trigger_indexnow_push : triggers trg_indexnow_* (DEFINER), sauf
--     trg_indexnow_articles, en SECURITY INVOKER (passé en DEFINER ci-dessous
--     pour que l'enregistrement d'un article par l'équipe continue) ;
--   les autres : aucun appelant.
-- =========================================================================
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.detect_stale_sits()',
    'public.get_dormant_recovery_context(uuid)',
    'public.mission_audience(double precision, double precision, text, uuid)',
    'public.get_owner_top_3_sitters(uuid)',
    'public.auto_archive_past_sits()',
    'public.refresh_all_sitter_reply_stats()',
    'public.auto_flag_urgent_sits()',
    'public.email_cap_bypass_counts(integer)',
    'public.email_delivery_rate_by_template(integer)',
    'public.check_city_guide_places_geo()',
    'public.get_sit_context_for_alma(uuid)',
    'public.get_sitter_context_for_alma(uuid, uuid)',
    'public._calculate_sitter_score_pre_20260830(uuid)',
    'public.trigger_indexnow_push(text, text)'
  ] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
    END IF;
  END LOOP;
END $$;

-- Le trigger des articles appelait trigger_indexnow_push avec les droits de
-- l'auteur de la modification : il passe en SECURITY DEFINER.
ALTER FUNCTION public.trg_indexnow_articles() SECURITY DEFINER;
ALTER FUNCTION public.trg_indexnow_articles() SET search_path TO 'public';

-- calculate_profile_completion : appelée par le site pour le membre connecté
-- (OnboardingModal, useOwnerProfile, useSitterProfile) et par les triggers
-- trigger_recalc_completion_* (SECURITY DEFINER, sur l'écriture d'un tiers
-- parfois). Un appel direct ne vise plus que soi, sauf équipe ; un appel
-- depuis un trigger (pg_trigger_depth() > 0) ou sans session (service_role,
-- cron) reste libre.
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_score integer := 0;
  v_owner integer;
  v_sitter integer;
BEGIN
  IF pg_trigger_depth() = 0
     AND auth.uid() IS NOT NULL
     AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  IF v_role IS NULL THEN RETURN 0; END IF;

  IF v_role = 'owner' THEN
    v_score := public._calculate_owner_score(p_user_id);
  ELSIF v_role = 'both' THEN
    v_owner := public._calculate_owner_score(p_user_id);
    v_sitter := public._calculate_sitter_score(p_user_id);
    v_score := GREATEST(COALESCE(v_owner, 0), COALESCE(v_sitter, 0));
  ELSE
    v_score := public._calculate_sitter_score(p_user_id);
  END IF;

  UPDATE public.profiles SET profile_completion = v_score WHERE id = p_user_id;
  RETURN v_score;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.calculate_profile_completion(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completion(uuid) TO authenticated, service_role;

-- get_unread_messages_count : appelée par useSitterDashboardData pour le
-- membre connecté. Passe en plpgsql pour porter le contrôle.
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NOT NULL
     AND _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(cnt), 0)::int INTO v_count FROM (
    SELECT COUNT(*) AS cnt
    FROM public.conversations c
    JOIN public.messages m
      ON m.conversation_id = c.id
     AND m.read_at IS NULL
     AND m.sender_id <> _user_id
    WHERE c.owner_id = _user_id
      AND NOT (_user_id = ANY(COALESCE(c.archived_by, '{}'::uuid[])))
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.conversations c
    JOIN public.messages m
      ON m.conversation_id = c.id
     AND m.read_at IS NULL
     AND m.sender_id <> _user_id
    WHERE c.sitter_id = _user_id
      AND c.owner_id IS DISTINCT FROM _user_id  -- évite double comptage si owner = sitter
      AND NOT (_user_id = ANY(COALESCE(c.archived_by, '{}'::uuid[])))
  ) s;
  RETURN v_count;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_unread_messages_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_messages_count(uuid) TO authenticated, service_role;

-- =========================================================================
-- P3-05 : find_duplicate_gmail_account renvoyait l'email d'un tiers.
-- Appelants : DuplicateAccountGuard (membre connecté, son propre id) et
-- delete-empty-duplicate-account (client à la session de l'appelant, son
-- propre id). Sans session (service_role, postgres) : libre.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.find_duplicate_gmail_account(_user_id uuid)
 RETURNS TABLE(canonical_email text, canonical_user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT id, lower(email) AS email
    FROM public.profiles
    WHERE id = _user_id
      AND (auth.uid() IS NULL
           OR _user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin'::app_role))
  ),
  parts AS (
    SELECT
      me.id,
      split_part(me.email, '@', 1) AS local,
      split_part(me.email, '@', 2) AS domain
    FROM me
  ),
  norm AS (
    SELECT
      id,
      domain,
      replace(local, '.', '') AS local_nodot
    FROM parts
    WHERE domain IN ('gmail.com', 'googlemail.com')
  )
  SELECT p.email, p.id
  FROM public.profiles p, norm
  WHERE p.id <> norm.id
    AND lower(split_part(p.email, '@', 2)) IN ('gmail.com', 'googlemail.com')
    AND replace(lower(split_part(p.email, '@', 1)), '.', '') = norm.local_nodot
  LIMIT 1;
$function$;
REVOKE EXECUTE ON FUNCTION public.find_duplicate_gmail_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_gmail_account(uuid) TO authenticated, service_role;

-- =========================================================================
-- P3-06 : allergie (donnée de santé) lisible par tout membre.
-- sitter_profiles_affinity sert « Pas de chats » ou « Pas de chiens » à la
-- place d'une allergie, sauf pour le titulaire, l'équipe et le propriétaire
-- d'une garde où ce gardien est retenu (candidature acceptée). Le moteur
-- d'affinité traite le libellé neutre comme l'allergie (vocab.ts,
-- NEUTRAL_SENSITIVITY_BY_SPECIES). La vue suit aussi le statut du compte et
-- « Qui peut voir mon profil » (X3c), comme public_profiles.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.sitter_health_visible(_sitter uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    _sitter = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.applications a
        JOIN public.sits s ON s.id = a.sit_id
       WHERE a.sitter_id = _sitter
         AND s.user_id = auth.uid()
         AND a.status = 'accepted'::application_status
    )
  );
$function$;
REVOKE EXECUTE ON FUNCTION public.sitter_health_visible(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sitter_health_visible(uuid) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.sitter_profiles_affinity WITH (security_barrier = true) AS
SELECT s.user_id,
       s.experience_years,
       s.life_pace,
       s.languages,
       s.interests,
       s.work_during_sit,
       CASE WHEN public.sitter_health_visible(s.user_id) THEN s.sensitivities
            ELSE array_replace(array_replace(s.sensitivities,
                   'Allergie aux chats', 'Pas de chats'),
                   'Allergie aux chiens', 'Pas de chiens')
       END AS sensitivities,
       s.animal_types,
       s.sitter_type,
       s.travels_with_children,
       s.travels_with_own_animals,
       s.lifestyle,
       s.availability_during,
       s.has_vehicle,
       s.has_license,
       s.special_animal_skills,
       s.farm_animals_ok
  FROM public.sitter_profiles s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.notification_preferences np ON np.user_id = s.user_id
 WHERE s.user_id = auth.uid()
    OR (p.account_status = 'active'
        AND CASE WHEN COALESCE(np.profile_visibility, 'all') = 'verified'
                 THEN public.can_view_restricted_profile(s.user_id)
                 ELSE true END);
REVOKE ALL ON public.sitter_profiles_affinity FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.sitter_profiles_affinity TO authenticated, service_role;

-- =========================================================================
-- P3-07 : photos d'intérieur de logements jamais publiés lisibles par anon.
-- Même règle que properties : le titulaire, l'équipe, ou une annonce visible
-- (publiée, confirmée, en cours, terminée ou archivée, non masquée).
-- =========================================================================
DROP POLICY IF EXISTS "Owner gallery photos are publicly readable" ON public.owner_gallery;
DROP POLICY IF EXISTS "Owner gallery readable by owner or via visible sit" ON public.owner_gallery;
CREATE POLICY "Owner gallery readable by owner or via visible sit" ON public.owner_gallery
  FOR SELECT TO anon, authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.sits s
       WHERE s.user_id = owner_gallery.user_id
         AND s.status IN ('published', 'confirmed', 'in_progress', 'completed', 'archived')
         AND s.moderation_hidden_at IS NULL
    )
  );

-- =========================================================================
-- P3-08 : écussons, mots d'entraide et mises en avant écrivables sur
-- n'importe quel membre. Insertion réservée aux deux parties d'une garde
-- (candidature acceptée) ou d'un coup de main (réponse acceptée). Les
-- attributions faites par des fonctions SECURITY DEFINER (écusson « coup de
-- main en or ») ne passent pas par ces politiques. L'équipe garde l'écusson
-- manuel.
-- =========================================================================
DROP POLICY IF EXISTS "ba_insert_authenticated" ON public.badge_attributions;
DROP POLICY IF EXISTS "ba_insert_parties_only" ON public.badge_attributions;
CREATE POLICY "ba_insert_parties_only" ON public.badge_attributions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = giver_id
    AND giver_id <> user_id
    AND COALESCE(is_manual, false) = false
    AND (
      (sit_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.sits s
          JOIN public.applications a ON a.sit_id = s.id AND a.status = 'accepted'::application_status
         WHERE s.id = badge_attributions.sit_id
           AND ((s.user_id = auth.uid() AND a.sitter_id = badge_attributions.user_id)
             OR (a.sitter_id = auth.uid() AND s.user_id = badge_attributions.user_id))))
      OR (mission_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.small_missions m
          JOIN public.small_mission_responses r ON r.mission_id = m.id AND r.status = 'accepted'
         WHERE m.id = badge_attributions.mission_id
           AND ((m.user_id = auth.uid() AND r.responder_id = badge_attributions.user_id)
             OR (r.responder_id = auth.uid() AND m.user_id = badge_attributions.user_id))))
    )
  );
DROP POLICY IF EXISTS "ba_insert_admin" ON public.badge_attributions;
CREATE POLICY "ba_insert_admin" ON public.badge_attributions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.mission_feedbacks;
DROP POLICY IF EXISTS "Mission parties insert feedback" ON public.mission_feedbacks;
CREATE POLICY "Mission parties insert feedback" ON public.mission_feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = giver_id
    AND giver_id <> receiver_id
    AND EXISTS (
      SELECT 1 FROM public.small_missions m
        JOIN public.small_mission_responses r ON r.mission_id = m.id AND r.status = 'accepted'
       WHERE m.id = mission_feedbacks.mission_id
         AND ((m.user_id = auth.uid() AND r.responder_id = mission_feedbacks.receiver_id)
           OR (r.responder_id = auth.uid() AND m.user_id = mission_feedbacks.receiver_id)))
  );

DROP POLICY IF EXISTS "Sitters can insert highlights" ON public.owner_highlights;
DROP POLICY IF EXISTS "Accepted sitter inserts highlight" ON public.owner_highlights;
CREATE POLICY "Accepted sitter inserts highlight" ON public.owner_highlights
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sitter_id
    AND EXISTS (
      SELECT 1 FROM public.sits s
        JOIN public.applications a ON a.sit_id = s.id
       WHERE s.id = owner_highlights.sit_id
         AND s.user_id = owner_highlights.owner_id
         AND a.sitter_id = auth.uid()
         AND a.status = 'accepted'::application_status)
  );

-- =========================================================================
-- P3-09 : l'auteur effaçait une décision de modération par un simple update.
-- moderation_hidden_at, moderation_hidden_by et status_before_hidden sont
-- réservés à l'équipe (has_role admin, écrans AdminListings et
-- AdminSmallMissions) et aux appels sans session (service_role, cron). Les
-- écritures en cascade d'un autre trigger (pg_trigger_depth() > 1) passent.
-- hidden_by et hidden_at restent à l'auteur (masquage volontaire). Aucune
-- fonction SQL n'écrit ces colonnes (relu le 13/10/2026).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.guard_moderation_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL
     OR pg_trigger_depth() > 1
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.moderation_hidden_at IS DISTINCT FROM OLD.moderation_hidden_at
     OR NEW.moderation_hidden_by IS DISTINCT FROM OLD.moderation_hidden_by
     OR NEW.status_before_hidden IS DISTINCT FROM OLD.status_before_hidden THEN
    RAISE EXCEPTION 'Champ de modération réservé à l''équipe'
      USING ERRCODE = '42501', HINT = 'moderation_reserved';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.guard_moderation_columns() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_moderation_columns ON public.sits;
CREATE TRIGGER trg_guard_moderation_columns BEFORE UPDATE ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.guard_moderation_columns();
DROP TRIGGER IF EXISTS trg_guard_moderation_columns ON public.small_missions;
CREATE TRIGGER trg_guard_moderation_columns BEFORE UPDATE ON public.small_missions
  FOR EACH ROW EXECUTE FUNCTION public.guard_moderation_columns();

-- =========================================================================
-- P3-11 : réputation, reconnaissance et écussons d'entraide d'autrui
-- toujours vides (vues security_invoker sur des tables réservées au
-- titulaire). Agrégats sans colonne sensible, comptes actifs seulement,
-- lus avec les droits du propriétaire de la vue. Après P3-08 : les écussons
-- comptés ne viennent plus que des parties d'un échange.
-- =========================================================================
CREATE OR REPLACE VIEW public.helper_recognition_stats AS
SELECT r.responder_id AS user_id,
       count(*) FILTER (WHERE r.status = 'accepted'::small_mission_response_status) AS selected_count,
       COALESCE(sum(r.helpful_count), 0::bigint)::integer AS useful_count
  FROM public.small_mission_responses r
  JOIN public.profiles p ON p.id = r.responder_id AND p.account_status = 'active'
 GROUP BY r.responder_id;
ALTER VIEW public.helper_recognition_stats SET (security_invoker = false);

CREATE OR REPLACE VIEW public.profile_mission_badges AS
SELECT f.receiver_id AS user_id,
       f.badge_key,
       count(*)::integer AS earned_count,
       max(f.created_at) AS last_earned_at
  FROM public.mission_feedbacks f
  JOIN public.profiles p ON p.id = f.receiver_id AND p.account_status = 'active'
 WHERE f.badge_key IS NOT NULL
 GROUP BY f.receiver_id, f.badge_key;
ALTER VIEW public.profile_mission_badges SET (security_invoker = false);

-- profile_reputation filtre déjà les comptes actifs (définition relue).
ALTER VIEW public.profile_reputation SET (security_invoker = false);

REVOKE ALL ON public.helper_recognition_stats, public.profile_mission_badges, public.profile_reputation FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.helper_recognition_stats, public.profile_mission_badges, public.profile_reputation TO anon, authenticated, service_role;

-- public_stats : inutilisée (get_public_stats la remplace). Gardée, fermée.
REVOKE ALL ON public.public_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_stats TO service_role;

-- =========================================================================
-- P3-12 : annulations et image d'en-tête d'un gardien lues dans profiles
-- (titulaire seul). Ajoutées en fin de public_profiles, mêmes filtres X3c.
-- =========================================================================
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT p.id,
       p.first_name,
       p.city,
       p.avatar_url,
       p.bio,
       p.completed_sits_count,
       p.identity_verified,
       p.is_founder,
       p.postal_code,
       p.created_at,
       p.profile_completion,
       round(p.latitude::numeric, 2)::double precision AS latitude_approx,
       round(p.longitude::numeric, 2)::double precision AS longitude_approx,
       p.available_for_help,
       p.skill_categories,
       p.custom_skills,
       p.role,
       CASE WHEN COALESCE(np.show_last_seen, true) THEN p.last_seen_at
            ELSE NULL::timestamp with time zone END AS last_seen_at,
       p.departement_code,
       p.certifications,
       NULLIF(upper(TRIM(BOTH FROM p.country)), ''::text) AS country,
       p.cancellation_count,
       p.hero_image_index
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.id
 WHERE p.account_status = 'active'::text
   AND p.first_name IS NOT NULL
   AND CASE WHEN COALESCE(np.profile_visibility, 'all'::text) = 'verified'::text
            THEN public.can_view_restricted_profile(p.id)
            ELSE true END;
REVOKE ALL ON public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;

-- =========================================================================
-- P3-13 : seo_couverture_manquante (identifiant, commune, rôle de gardiens)
-- lisible par anon. Aucun lecteur dans src ni supabase/functions.
-- =========================================================================
REVOKE ALL ON public.seo_couverture_manquante FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.seo_couverture_manquante TO service_role;

-- =========================================================================
-- P3-14 : public_owner_profiles, public_sitter_profiles et get_member_display
-- ignoraient « Qui peut voir mon profil » (X3c). Même règle que
-- public_profiles ; le titulaire se lit toujours.
-- =========================================================================
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
       o.created_at
  FROM public.owner_profiles o
  JOIN public.profiles p ON p.id = o.user_id
  LEFT JOIN public.notification_preferences np ON np.user_id = o.user_id
 WHERE o.user_id = auth.uid()
    OR (p.account_status = 'active'
        AND CASE WHEN COALESCE(np.profile_visibility, 'all') = 'verified'
                 THEN public.can_view_restricted_profile(o.user_id)
                 ELSE true END);
REVOKE ALL ON public.public_owner_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_owner_profiles TO anon, authenticated, service_role;

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
       s.travel_zones
  FROM public.sitter_profiles s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.notification_preferences np ON np.user_id = s.user_id
 WHERE p.account_status = 'active'::text
   AND p.first_name IS NOT NULL
   AND CASE WHEN COALESCE(np.profile_visibility, 'all') = 'verified'
            THEN public.can_view_restricted_profile(s.user_id)
            ELSE true END;
REVOKE ALL ON public.public_sitter_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_sitter_profiles TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_member_display(_ids uuid[])
 RETURNS TABLE(id uuid, first_name text, avatar_url text, is_deleted boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    CASE
      WHEN p.account_status = 'deleted' THEN 'Membre supprimé'
      WHEN COALESCE(np.profile_visibility, 'all') = 'verified'
           AND NOT public.can_view_restricted_profile(p.id) THEN 'Membre'
      ELSE p.first_name
    END,
    CASE
      WHEN p.account_status = 'deleted' THEN NULL
      WHEN COALESCE(np.profile_visibility, 'all') = 'verified'
           AND NOT public.can_view_restricted_profile(p.id) THEN NULL
      ELSE p.avatar_url
    END,
    (p.account_status = 'deleted')
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.id
  WHERE p.id = ANY(_ids);
$function$;
-- Lue par des pages publiques (avis d'un profil) : anon garde l'accès.
REVOKE EXECUTE ON FUNCTION public.get_member_display(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_display(uuid[]) TO anon, authenticated, service_role;

-- =========================================================================
-- P3-15 : brouillons éditoriaux et indicateurs internes lisibles.
-- Membres : contenus publiés seulement, l'équipe lit tout. Indicateurs
-- d'envoi et détecteur de contenu : service_role seul (alert-content-quality
-- lit par la clé de service). external_experiences : anon ne lit plus
-- admin_note ni screenshot_urls (colonnes accordées une à une ; la fiche
-- publique ne demande que les colonnes ci-dessous).
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated can read all city pages" ON public.seo_city_pages;
DROP POLICY IF EXISTS "Authenticated read published city pages" ON public.seo_city_pages;
CREATE POLICY "Authenticated read published city pages" ON public.seo_city_pages
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read all department pages" ON public.seo_department_pages;
DROP POLICY IF EXISTS "Authenticated read published department pages" ON public.seo_department_pages;
CREATE POLICY "Authenticated read published department pages" ON public.seo_department_pages
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read all guides" ON public.city_guides;
DROP POLICY IF EXISTS "Authenticated read published guides" ON public.city_guides;
CREATE POLICY "Authenticated read published guides" ON public.city_guides
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read all FAQ entries" ON public.faq_entries;
DROP POLICY IF EXISTS "Authenticated read published FAQ entries" ON public.faq_entries;
CREATE POLICY "Authenticated read published FAQ entries" ON public.faq_entries
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read all places" ON public.city_guide_places;
DROP POLICY IF EXISTS "Authenticated read places of published guides" ON public.city_guide_places;
CREATE POLICY "Authenticated read places of published guides" ON public.city_guide_places
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.city_guides g
                WHERE g.id = city_guide_places.city_guide_id AND g.published = true)
  );

REVOKE ALL ON public.email_delivery_stats, public.v_content_defects, public.v_detector_selftest FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.email_delivery_stats, public.v_content_defects, public.v_detector_selftest TO service_role;

REVOKE ALL ON public.external_experiences FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, user_id, platform_name, summary, animal_types, city, country, duration,
              experience_date, verification_status, created_at)
  ON public.external_experiences TO anon;
-- Le membre lit sa propre ligne en entier (motif de refus) : droits de table
-- rendus, la politique « Users can view verified or own experiences » borne.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_experiences TO authenticated;
GRANT ALL ON public.external_experiences TO service_role;

-- =========================================================================
-- P3-16 : un avis validé mais non publié (double aveugle) lisible par anon.
-- =========================================================================
DROP POLICY IF EXISTS "Anon can view published reviews" ON public.reviews;
CREATE POLICY "Anon can view published reviews" ON public.reviews
  FOR SELECT TO anon
  USING (moderation_status = 'valide' AND published = true);

-- =========================================================================
-- P3-17 : buckets publics listables. Un bucket public sert ses fichiers par
-- URL (/object/public, /render/image/public) sans politique SELECT. Le
-- membre garde la lecture de son dossier, nécessaire à remove() et à
-- upload({ upsert: true }) ; toutes les écritures sont déjà bornées au
-- dossier auth.uid(). Aucun écran n'appelle list() ni download() sur ces
-- buckets (src relu le 13/10/2026).
-- =========================================================================
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read property-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read mission-photos" ON storage.objects;
DROP POLICY IF EXISTS "Owner lists own public files" ON storage.objects;
CREATE POLICY "Owner lists own public files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('avatars', 'property-photos', 'mission-photos')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =========================================================================
-- P3-18 : tables RLS sans politique (sauvegardes, jetons, verrous) avec
-- droits complets d'anon et authenticated. Fermées par l'absence de
-- politique seulement ; les droits SQL sont retirés.
-- =========================================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND c.relrowsecurity
       AND NOT EXISTS (SELECT 1 FROM pg_policies p
                        WHERE p.schemaname = 'public' AND p.tablename = c.relname)
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- =========================================================================
-- Y2-V1 (constat ajouté le 13/10/2026, P0) : vues écrivables.
-- public_badge_attributions (anon et authenticated) et member_owner_profiles
-- (authenticated) sont des vues simples, donc modifiables, avec les droits
-- INSERT, UPDATE et DELETE. Une écriture à travers une vue s'exécute avec
-- les droits de son propriétaire (postgres, BYPASSRLS) : la RLS de
-- badge_attributions et d'owner_profiles ne s'appliquait pas. Aucun écran
-- n'écrit dans une vue. Toutes les vues du schéma public redeviennent en
-- lecture seule pour anon et authenticated.
-- =========================================================================
DO $$
DECLARE v text;
BEGIN
  FOR v IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM PUBLIC, anon, authenticated', v);
  END LOOP;
END $$;

-- =========================================================================
-- Contrôle en base à lancer après chaque migration (doit renvoyer 0 ligne).
-- Fonction SECURITY DEFINER exécutable par anon ou authenticated, qui
-- renvoie une colonne email (y compris owner_email, canonical_email), sans
-- contrôle d'appelant dans son corps. Requête du rapport P3, motif élargi à
-- toute colonne contenant « email ». Le même verrou existe en analyse
-- statique : src/__tests__/y2/security-definer-email.test.ts.
-- =========================================================================
-- SELECT p.oid::regprocedure
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
--    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
--         OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
--    AND pg_get_function_result(p.oid) ~* 'email'
--    AND pg_get_functiondef(p.oid) !~* '(auth\.uid\(\)|has_role)';
--
-- Contrôles complémentaires (doivent renvoyer 0 ligne) :
-- vue écrivable par anon ou authenticated
-- SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
--    AND (has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE')
--         OR has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE'));
-- table RLS sans politique encore ouverte à anon ou authenticated
-- SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
--    AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname)
--    AND (has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
--         OR has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE'));
