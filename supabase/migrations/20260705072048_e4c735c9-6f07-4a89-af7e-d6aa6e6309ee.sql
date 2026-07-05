-- 1. Colonne compteur "utile" (mercis communautaires)
ALTER TABLE public.small_mission_responses
  ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0;

-- 2. Lecture publique des réponses (modèle commentaires)
DROP POLICY IF EXISTS "Mission owner and responder can read" ON public.small_mission_responses;

CREATE POLICY "Anyone can read mission responses"
  ON public.small_mission_responses
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.small_mission_responses TO anon;

-- 3. Vue agrégée de reconnaissance entraide
CREATE OR REPLACE VIEW public.helper_recognition_stats
WITH (security_invoker = true)
AS
SELECT
  r.responder_id                                    AS user_id,
  COUNT(*) FILTER (WHERE r.status = 'accepted')     AS selected_count,
  COALESCE(SUM(r.helpful_count), 0)::int            AS useful_count
FROM public.small_mission_responses r
GROUP BY r.responder_id;

GRANT SELECT ON public.helper_recognition_stats TO anon, authenticated;