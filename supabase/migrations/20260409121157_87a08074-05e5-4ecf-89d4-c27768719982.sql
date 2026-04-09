-- 1. Recreate views as SECURITY INVOKER

-- public_stats
DROP VIEW IF EXISTS public.public_stats;
CREATE VIEW public.public_stats WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM profiles) AS total_inscrits,
  (SELECT count(*) FROM sits WHERE status = 'completed') AS maisons_gardees,
  (SELECT count(*) FROM small_missions WHERE status = 'completed') AS missions_entraide,
  (SELECT count(p.id) FROM sits s JOIN properties pr ON pr.id = s.property_id JOIN pets p ON p.property_id = pr.id WHERE s.status = 'completed') AS animaux_accompagnes;

-- avis_publics
DROP VIEW IF EXISTS public.avis_publics;
CREATE VIEW public.avis_publics WITH (security_invoker = true) AS
SELECT id, sit_id, reviewer_id, reviewee_id, overall_rating, comment, published, created_at,
       animal_care_rating, communication_rating, housing_respect_rating, reliability_rating,
       listing_accuracy_rating, welcome_rating, instructions_clarity_rating, housing_condition_rating,
       would_recommend, review_type, moderation_status
FROM reviews
WHERE moderation_status = 'valide';

-- public_profiles
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
SELECT id, first_name, city, avatar_url, bio, completed_sits_count, identity_verified, is_founder
FROM profiles
WHERE account_status = 'active';

-- profile_reputation (depends on profile_moderation, reputation_config, etc.)
DROP VIEW IF EXISTS public.profile_reputation;
CREATE VIEW public.profile_reputation WITH (security_invoker = true) AS
WITH config AS (
  SELECT
    (SELECT value::integer FROM reputation_config WHERE key = 'confirmed_min_sits') AS confirmed_sits,
    (SELECT value::integer FROM reputation_config WHERE key = 'confirmed_min_badges') AS confirmed_badges,
    (SELECT value::integer FROM reputation_config WHERE key = 'super_min_sits') AS super_sits,
    (SELECT value::integer FROM reputation_config WHERE key = 'super_min_badges') AS super_badges,
    (SELECT value::numeric FROM reputation_config WHERE key = 'super_min_rating') AS super_rating,
    (SELECT value::integer FROM reputation_config WHERE key = 'badge_expiry_months') AS expiry_months
),
active_badges AS (
  SELECT ba.user_id, count(DISTINCT ba.badge_id) AS active_badge_count
  FROM badge_attributions ba CROSS JOIN config c
  WHERE ba.created_at > (now() - (c.expiry_months || ' months')::interval)
  GROUP BY ba.user_id
),
completed_sits AS (
  SELECT a.sitter_id AS user_id, count(DISTINCT s.id) AS sit_count
  FROM sits s JOIN applications a ON a.sit_id = s.id AND a.status = 'accepted'
  WHERE s.status = 'completed'
  GROUP BY a.sitter_id
),
avg_ratings AS (
  SELECT reviewee_id AS user_id, round(avg(overall_rating), 2) AS note_moyenne
  FROM reviews
  WHERE review_type IS NULL OR review_type <> 'mission'
  GROUP BY reviewee_id
)
SELECT
  p.id AS user_id,
  COALESCE(cs.sit_count, 0) AS completed_sits,
  COALESCE(ab.active_badge_count, 0) AS active_badges,
  COALESCE(ar.note_moyenne, 0) AS note_moyenne,
  CASE
    WHEN COALESCE(pm.is_manual_super, false) = true THEN 'super_gardien'
    WHEN COALESCE(cs.sit_count, 0) >= c.super_sits AND COALESCE(ab.active_badge_count, 0) >= c.super_badges AND COALESCE(ar.note_moyenne, 0) >= c.super_rating THEN 'super_gardien'
    WHEN COALESCE(cs.sit_count, 0) >= c.confirmed_sits AND COALESCE(ab.active_badge_count, 0) >= c.confirmed_badges THEN 'confirme'
    ELSE 'novice'
  END AS statut_gardien
FROM profiles p
CROSS JOIN config c
LEFT JOIN completed_sits cs ON cs.user_id = p.id
LEFT JOIN active_badges ab ON ab.user_id = p.id
LEFT JOIN avg_ratings ar ON ar.user_id = p.id
LEFT JOIN profile_moderation pm ON pm.profile_id = p.id
WHERE p.account_status = 'active';

-- 2. Restrict profiles INSERT to authenticated only
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Add/replace trigger to prevent user modification of sensitive fields
CREATE OR REPLACE FUNCTION public.trg_prevent_sensitive_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role to bypass
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow admins to bypass
  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Block changes to sensitive fields
  IF NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
     OR NEW.identity_verification_status IS DISTINCT FROM OLD.identity_verification_status
     OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
     OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
     OR NEW.free_months_credit IS DISTINCT FROM OLD.free_months_credit
     OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
     OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
  THEN
    RAISE EXCEPTION 'Modification de champs sensibles interdite';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_sensitive_profile_updates ON profiles;
CREATE TRIGGER trg_prevent_sensitive_profile_updates
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_sensitive_profile_updates();

-- Grant SELECT on views to appropriate roles
GRANT SELECT ON public.public_stats TO anon, authenticated;
GRANT SELECT ON public.avis_publics TO anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT SELECT ON public.profile_reputation TO authenticated;