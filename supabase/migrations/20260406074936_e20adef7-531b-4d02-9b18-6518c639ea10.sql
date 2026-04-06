
DROP VIEW IF EXISTS profile_reputation;

CREATE VIEW profile_reputation WITH (security_invoker = true) AS
WITH config AS (
  SELECT
    (SELECT value::int     FROM reputation_config WHERE key = 'confirmed_min_sits')   AS confirmed_sits,
    (SELECT value::int     FROM reputation_config WHERE key = 'confirmed_min_badges') AS confirmed_badges,
    (SELECT value::int     FROM reputation_config WHERE key = 'super_min_sits')       AS super_sits,
    (SELECT value::int     FROM reputation_config WHERE key = 'super_min_badges')     AS super_badges,
    (SELECT value::numeric FROM reputation_config WHERE key = 'super_min_rating')     AS super_rating,
    (SELECT value::int     FROM reputation_config WHERE key = 'badge_expiry_months')  AS expiry_months
),
active_badges AS (
  SELECT
    ba.user_id,
    COUNT(DISTINCT ba.badge_id) AS active_badge_count
  FROM badge_attributions ba
  CROSS JOIN config c
  WHERE ba.created_at > now() - (c.expiry_months || ' months')::interval
  GROUP BY ba.user_id
),
completed_sits AS (
  SELECT
    a.sitter_id  AS user_id,
    COUNT(DISTINCT s.id) AS sit_count
  FROM sits s
  JOIN applications a
    ON a.sit_id = s.id
   AND a.status = 'accepted'
  WHERE s.status = 'completed'
  GROUP BY a.sitter_id
),
avg_ratings AS (
  SELECT
    reviewee_id AS user_id,
    ROUND(AVG(overall_rating)::numeric, 2) AS note_moyenne
  FROM reviews
  GROUP BY reviewee_id
)
SELECT
  p.id                                        AS user_id,
  COALESCE(cs.sit_count, 0)                   AS completed_sits,
  COALESCE(ab.active_badge_count, 0)          AS active_badges,
  COALESCE(ar.note_moyenne, 0)                AS note_moyenne,
  COALESCE(p.is_manual_super, false)          AS is_manual_super,
  CASE
    WHEN COALESCE(p.is_manual_super, false) = true
      THEN 'super_gardien'
    WHEN COALESCE(cs.sit_count, 0)        >= c.super_sits
     AND COALESCE(ab.active_badge_count, 0) >= c.super_badges
     AND COALESCE(ar.note_moyenne, 0)     >= c.super_rating
      THEN 'super_gardien'
    WHEN COALESCE(cs.sit_count, 0)        >= c.confirmed_sits
     AND COALESCE(ab.active_badge_count, 0) >= c.confirmed_badges
      THEN 'confirme'
    ELSE 'novice'
  END                                         AS statut_gardien
FROM profiles p
CROSS JOIN config c
LEFT JOIN completed_sits cs ON cs.user_id = p.id
LEFT JOIN active_badges  ab ON ab.user_id = p.id
LEFT JOIN avg_ratings    ar ON ar.user_id = p.id;
