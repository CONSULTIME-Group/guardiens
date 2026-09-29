-- LOT SEC1, points critiques du controle de securite (29/09/2026).
-- Aucune ligne metier modifiee ni supprimee, aucun fichier de stockage supprime.
--
-- RETOUR ARRIERE (a executer dans une migration, dans cet ordre) :
--   DROP POLICY IF EXISTS "SEC1 owner profile read owner admin engaged sitter" ON public.owner_profiles;
--   CREATE POLICY "Owner profiles are viewable by authenticated users" ON public.owner_profiles FOR SELECT TO authenticated USING (true);
--   DROP POLICY IF EXISTS "SEC1 badge read receiver giver admin" ON public.badge_attributions;
--   CREATE POLICY ba_select_public ON public.badge_attributions FOR SELECT TO public USING (true);
--   DROP POLICY IF EXISTS "SEC1 thanks read author responder admin" ON public.small_mission_response_thanks;
--   CREATE POLICY "Anyone can read thanks" ON public.small_mission_response_thanks FOR SELECT TO anon, authenticated USING (true);
--   DROP POLICY IF EXISTS "SEC1 admins read alma moods" ON public.alma_moods;
--   CREATE POLICY "Authenticated can read alma moods" ON public.alma_moods FOR SELECT TO authenticated USING (true);
--   DROP POLICY IF EXISTS "SEC1 association photos consent granted or admin" ON storage.objects;
--   CREATE POLICY "Association photos are readable by everyone" ON storage.objects FOR SELECT TO public USING (bucket_id = 'association-photos');
--   DROP POLICY IF EXISTS "SEC1 pro logos admin read" ON storage.objects;
--   CREATE POLICY "Public can view pro logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'pro-logos');
--   profile_reputation : reprendre la definition sauvegardee (kind = 'view') dans public._backup_policies_sec1_20260929.
--   Les vues member_owner_profiles et public_badge_attributions peuvent rester (elles ne donnent rien de plus qu'avant).

-- 0. Sauvegarde des definitions avant modification
CREATE TABLE public._backup_policies_sec1_20260929 AS
SELECT 'policy'::text AS kind, schemaname::text, tablename::text, policyname::text AS name,
       permissive::text, roles::text AS roles, cmd::text, qual::text, with_check::text, now() AS saved_at
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('owner_profiles','alma_moods','small_mission_response_thanks','hero_weights','badge_attributions','competences_validees'))
   OR (schemaname = 'storage' AND tablename = 'objects' AND (coalesce(qual,'') || coalesce(with_check,'')) ~ '(association-photos|pro-logos)')
UNION ALL
SELECT 'view', 'public', 'profile_reputation', 'profile_reputation', NULL, NULL, NULL,
       pg_get_viewdef('public.profile_reputation'::regclass, true), 'security_invoker=true', now()
UNION ALL
SELECT 'view', 'public', 'public_owner_profiles', 'public_owner_profiles', NULL, NULL, NULL,
       pg_get_viewdef('public.public_owner_profiles'::regclass, true), NULL, now();
GRANT ALL ON public._backup_policies_sec1_20260929 TO service_role;
ALTER TABLE public._backup_policies_sec1_20260929 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public._backup_policies_sec1_20260929 IS 'Sauvegarde SEC1 du 29/09/2026 : politiques RLS et stockage, vues, avant fermeture.';

-- 1. owner_profiles
CREATE OR REPLACE FUNCTION public.is_engaged_sitter_of(_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE s.user_id = _owner_id
      AND a.sitter_id = auth.uid()
      AND a.status IN ('accepted'::application_status, 'discussing'::application_status)
  )
$$;
REVOKE ALL ON FUNCTION public.is_engaged_sitter_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_engaged_sitter_of(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Owner profiles are viewable by authenticated users" ON public.owner_profiles;
CREATE POLICY "SEC1 owner profile read owner admin engaged sitter" ON public.owner_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role) OR public.is_engaged_sitter_of(user_id));

-- Lecture membre : colonnes utiles a un gardien qui prepare une candidature.
-- Exclues : household_composition, communication_notes, preferred_time, accept_unsolicited_pitches.
CREATE VIEW public.member_owner_profiles WITH (security_barrier = true) AS
SELECT user_id, presence_expected, visits_allowed, overnight_guest, space_usage, smoker_accepted,
       rules_notes, meeting_preference, handover_preference, welcome_notes, news_frequency, news_format,
       specific_expectations, experience_required, environments, preferred_sitter_types, home_ambiance,
       languages, interests, life_pace, competences, competences_disponible
FROM public.owner_profiles
WHERE auth.uid() IS NOT NULL;
REVOKE ALL ON public.member_owner_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.member_owner_profiles TO authenticated, service_role;
COMMENT ON VIEW public.member_owner_profiles IS 'SEC1 : lecture membre connecte des preferences propriétaire utiles a une candidature, sans composition du foyer ni habitudes de contact.';

-- 2. badge_attributions : lecture publique sans le donneur
CREATE VIEW public.public_badge_attributions WITH (security_barrier = true) AS
SELECT id, user_id, badge_id, sit_id, mission_id, is_manual, created_at
FROM public.badge_attributions;
GRANT SELECT ON public.public_badge_attributions TO anon, authenticated, service_role;
COMMENT ON VIEW public.public_badge_attributions IS 'SEC1 : ecussons publics affiches sur les fiches, sans giver_id.';

DROP POLICY IF EXISTS ba_select_public ON public.badge_attributions;
CREATE POLICY "SEC1 badge read receiver giver admin" ON public.badge_attributions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = giver_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.profile_reputation WITH (security_invoker = true) AS
 WITH config AS (
         SELECT ( SELECT reputation_config.value::integer AS value FROM reputation_config WHERE reputation_config.key = 'confirmed_min_sits'::text) AS confirmed_sits,
            ( SELECT reputation_config.value::integer AS value FROM reputation_config WHERE reputation_config.key = 'confirmed_min_badges'::text) AS confirmed_badges,
            ( SELECT reputation_config.value::integer AS value FROM reputation_config WHERE reputation_config.key = 'super_min_sits'::text) AS super_sits,
            ( SELECT reputation_config.value::integer AS value FROM reputation_config WHERE reputation_config.key = 'super_min_badges'::text) AS super_badges,
            ( SELECT reputation_config.value::numeric AS value FROM reputation_config WHERE reputation_config.key = 'super_min_rating'::text) AS super_rating,
            ( SELECT reputation_config.value::integer AS value FROM reputation_config WHERE reputation_config.key = 'badge_expiry_months'::text) AS expiry_months
        ), active_badges AS (
         SELECT ba.user_id, count(DISTINCT ba.badge_id) AS active_badge_count
           FROM public_badge_attributions ba CROSS JOIN config c_1
          WHERE ba.created_at > (now() - ((c_1.expiry_months || ' months'::text)::interval))
          GROUP BY ba.user_id
        ), completed_sits AS (
         SELECT a.sitter_id AS user_id, count(DISTINCT s.id) AS sit_count
           FROM sits s JOIN applications a ON a.sit_id = s.id AND a.status = 'accepted'::application_status
          WHERE s.status = 'completed'::sit_status
          GROUP BY a.sitter_id
        ), avg_ratings AS (
         SELECT reviews.reviewee_id AS user_id, round(avg(reviews.overall_rating), 2) AS note_moyenne
           FROM reviews
          WHERE reviews.review_type IS NULL OR reviews.review_type <> 'mission'::text
          GROUP BY reviews.reviewee_id
        )
 SELECT p.id AS user_id,
    COALESCE(cs.sit_count, 0::bigint) AS completed_sits,
    COALESCE(ab.active_badge_count, 0::bigint) AS active_badges,
    COALESCE(ar.note_moyenne, 0::numeric) AS note_moyenne,
        CASE
            WHEN COALESCE(pm.is_manual_super, false) = true THEN 'super_gardien'::text
            WHEN COALESCE(cs.sit_count, 0::bigint) >= c.super_sits AND COALESCE(ab.active_badge_count, 0::bigint) >= c.super_badges AND COALESCE(ar.note_moyenne, 0::numeric) >= c.super_rating THEN 'super_gardien'::text
            WHEN COALESCE(cs.sit_count, 0::bigint) >= c.confirmed_sits AND COALESCE(ab.active_badge_count, 0::bigint) >= c.confirmed_badges THEN 'confirme'::text
            ELSE 'novice'::text
        END AS statut_gardien
   FROM profiles p
     CROSS JOIN config c
     LEFT JOIN completed_sits cs ON cs.user_id = p.id
     LEFT JOIN active_badges ab ON ab.user_id = p.id
     LEFT JOIN avg_ratings ar ON ar.user_id = p.id
     LEFT JOIN profile_moderation pm ON pm.profile_id = p.id
  WHERE p.account_status = 'active'::text;

-- 3. small_mission_response_thanks : lien entre deux membres, lecture restreinte
DROP POLICY IF EXISTS "Anyone can read thanks" ON public.small_mission_response_thanks;
CREATE POLICY "SEC1 thanks read author responder admin" ON public.small_mission_response_thanks
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.small_mission_responses r WHERE r.id = response_id AND r.responder_id = auth.uid())
  );

-- 4. alma_moods : catalogue lu par le serveur (role service) et l'admin seulement
DROP POLICY IF EXISTS "Authenticated can read alma moods" ON public.alma_moods;
CREATE POLICY "SEC1 admins read alma moods" ON public.alma_moods
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Stockage association-photos : public seulement si accord granted
CREATE OR REPLACE FUNCTION public.association_photos_consented(_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.animal_associations a WHERE a.slug = _slug AND a.consent_status = 'granted')
$$;
GRANT EXECUTE ON FUNCTION public.association_photos_consented(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Association photos are readable by everyone" ON storage.objects;
CREATE POLICY "SEC1 association photos consent granted or admin" ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'association-photos'
    AND (public.association_photos_consented((storage.foldername(name))[1])
         OR public.has_role(auth.uid(), 'admin'::app_role))
  );

-- 6. Stockage pro-logos : annuaire retire, lecture admin seulement
DROP POLICY IF EXISTS "Public can view pro logos" ON storage.objects;
CREATE POLICY "SEC1 pro logos admin read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pro-logos' AND public.has_role(auth.uid(), 'admin'::app_role));
