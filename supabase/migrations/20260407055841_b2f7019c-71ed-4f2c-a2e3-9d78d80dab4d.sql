-- 1. Add exchange detail columns to small_mission_responses
ALTER TABLE public.small_mission_responses
  ADD COLUMN IF NOT EXISTS exchange_offer TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS need_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS exchange_date DATE;

-- 2. Recreate profile_reputation view filtering out mission reviews
DROP VIEW IF EXISTS public.profile_reputation;

CREATE VIEW public.profile_reputation AS
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
  WHERE review_type IS NULL OR review_type != 'mission'
  GROUP BY reviewee_id
)
SELECT
  p.id AS user_id,
  COALESCE(cs.sit_count, 0::bigint) AS completed_sits,
  COALESCE(ab.active_badge_count, 0::bigint) AS active_badges,
  COALESCE(ar.note_moyenne, 0::numeric) AS note_moyenne,
  COALESCE(p.is_manual_super, false) AS is_manual_super,
  CASE
    WHEN COALESCE(p.is_manual_super, false) = true THEN 'super_gardien'::text
    WHEN COALESCE(cs.sit_count, 0::bigint) >= c.super_sits
      AND COALESCE(ab.active_badge_count, 0::bigint) >= c.super_badges
      AND COALESCE(ar.note_moyenne, 0::numeric) >= c.super_rating THEN 'super_gardien'::text
    WHEN COALESCE(cs.sit_count, 0::bigint) >= c.confirmed_sits
      AND COALESCE(ab.active_badge_count, 0::bigint) >= c.confirmed_badges THEN 'confirme'::text
    ELSE 'novice'::text
  END AS statut_gardien
FROM profiles p
CROSS JOIN config c
LEFT JOIN completed_sits cs ON cs.user_id = p.id
LEFT JOIN active_badges ab ON ab.user_id = p.id
LEFT JOIN avg_ratings ar ON ar.user_id = p.id;