
-- ================================================
-- BLOC 1 — Nettoyage préalable
-- ================================================
DROP TABLE IF EXISTS badge_attributions CASCADE;

-- ================================================
-- BLOC 2 — Table badge_attributions (nouveau schema)
-- ================================================
CREATE TABLE badge_attributions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id    text        NOT NULL,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  giver_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  sit_id      uuid        REFERENCES sits(id) ON DELETE SET NULL,
  is_manual   boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_ba_user    ON badge_attributions(user_id);
CREATE INDEX idx_ba_badge   ON badge_attributions(user_id, badge_id);
CREATE INDEX idx_ba_created ON badge_attributions(user_id, created_at);

ALTER TABLE badge_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ba_select_public"
  ON badge_attributions FOR SELECT USING (true);

CREATE POLICY "ba_insert_authenticated"
  ON badge_attributions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = giver_id);

-- ================================================
-- BLOC 3 — Table reputation_config
-- ================================================
CREATE TABLE IF NOT EXISTS reputation_config (
  key        text    PRIMARY KEY,
  value      jsonb   NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO reputation_config (key, value) VALUES
  ('confirmed_min_sits',   '1'),
  ('confirmed_min_badges', '2'),
  ('super_min_sits',       '3'),
  ('super_min_badges',     '5'),
  ('super_min_rating',     '4.8'),
  ('badge_expiry_months',  '12')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE reputation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_select_public"
  ON reputation_config FOR SELECT USING (true);

CREATE POLICY "config_admin_all"
  ON reputation_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- BLOC 4 — Colonne is_manual_super sur profiles
-- ================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_manual_super boolean DEFAULT false;

-- ================================================
-- BLOC 5 — Vue profile_reputation
-- ================================================
CREATE OR REPLACE VIEW profile_reputation AS
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

-- ================================================
-- BLOC 6 — Fonction award_badge (SECURITY DEFINER)
-- ================================================
CREATE OR REPLACE FUNCTION award_badge(
  p_badge_id   text,
  p_user_id    uuid,
  p_giver_id   uuid,
  p_sit_id     uuid    DEFAULT NULL,
  p_is_manual  boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_sit_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM badge_attributions
    WHERE badge_id = p_badge_id
      AND user_id  = p_user_id
      AND sit_id   = p_sit_id
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO badge_attributions (badge_id, user_id, giver_id, sit_id, is_manual)
  VALUES (p_badge_id, p_user_id, p_giver_id, p_sit_id, p_is_manual)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
