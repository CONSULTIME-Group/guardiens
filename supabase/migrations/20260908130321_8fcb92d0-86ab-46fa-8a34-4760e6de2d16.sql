-- Délai médian de première réponse, par membre.
-- Source : public.conversations (id, owner_id, sitter_id) et public.messages
-- (conversation_id, sender_id, created_at, is_system).
-- Règle : on ne compte que les conversations REÇUES par le membre (premier
-- message humain écrit par l'autre participant) et auxquelles il a répondu.
-- Les conversations sans réponse sortent du numérateur ET du dénominateur.
CREATE OR REPLACE VIEW public.public_sitter_response_stats AS
WITH first_msg AS (
  SELECT m.conversation_id,
         min(m.created_at) AS first_at,
         (array_agg(m.sender_id ORDER BY m.created_at, m.id))[1] AS first_sender
    FROM public.messages m
   WHERE m.is_system IS NOT TRUE
   GROUP BY m.conversation_id
), received AS (
  SELECT c.id AS conversation_id,
         fm.first_at,
         CASE WHEN fm.first_sender = c.owner_id THEN c.sitter_id
              WHEN fm.first_sender = c.sitter_id THEN c.owner_id
              ELSE NULL END AS recipient
    FROM public.conversations c
    JOIN first_msg fm ON fm.conversation_id = c.id
), answered AS (
  SELECT r.recipient,
         EXTRACT(epoch FROM (
           (SELECT min(m.created_at)
              FROM public.messages m
             WHERE m.conversation_id = r.conversation_id
               AND m.sender_id = r.recipient
               AND m.is_system IS NOT TRUE
               AND m.created_at > r.first_at) - r.first_at
         )) / 60.0 AS response_minutes
    FROM received r
   WHERE r.recipient IS NOT NULL
)
SELECT a.recipient AS profile_id,
       count(*)::integer AS answered_conversations,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY a.response_minutes)::numeric)::integer
         AS median_first_response_minutes
  FROM answered a
 WHERE a.response_minutes IS NOT NULL
 GROUP BY a.recipient;

COMMENT ON VIEW public.public_sitter_response_stats IS
  'Médiane (minutes) du délai de première réponse aux conversations reçues, par membre. Agrégats uniquement, lecture publique.';

GRANT SELECT ON public.public_sitter_response_stats TO anon, authenticated;
GRANT ALL ON public.public_sitter_response_stats TO service_role;