-- Chantier 1: colonnes de clôture pour cycle de vie des missions
ALTER TABLE public.small_missions
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS close_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_small_missions_status_created_at
  ON public.small_missions (status, created_at);
CREATE INDEX IF NOT EXISTS idx_small_missions_status_date_needed
  ON public.small_missions (status, date_needed);

-- Chantier 4: vue agrégée des badges reçus en entraide (par receveur)
CREATE OR REPLACE VIEW public.profile_mission_badges AS
SELECT
  receiver_id AS user_id,
  badge_key,
  COUNT(*)::int AS earned_count,
  MAX(created_at) AS last_earned_at
FROM public.mission_feedbacks
WHERE badge_key IS NOT NULL
GROUP BY receiver_id, badge_key;

GRANT SELECT ON public.profile_mission_badges TO anon, authenticated;
GRANT ALL ON public.profile_mission_badges TO service_role;