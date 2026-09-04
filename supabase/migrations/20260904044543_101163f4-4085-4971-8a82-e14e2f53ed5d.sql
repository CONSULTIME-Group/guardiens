
-- Réactivité publique, moteur unique gardien et propriétaire.
-- Fenêtre glissante 90 jours. Aucun chiffre brut n'est exposé publiquement.
CREATE OR REPLACE FUNCTION public.compute_responsiveness_stats()
RETURNS TABLE (
  user_id uuid,
  contacts_total integer,
  replied_count integer,
  response_rate numeric,
  median_reply_minutes numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH fm AS (
  SELECT m.conversation_id,
         MIN(m.created_at) AS first_at,
         (ARRAY_AGG(m.sender_id ORDER BY m.created_at))[1] AS first_sender
  FROM public.messages m
  WHERE m.is_system IS NOT TRUE
  GROUP BY m.conversation_id
),
recv AS (
  SELECT c.id AS conversation_id,
         c.sit_id,
         c.sitter_id,
         c.owner_id,
         fm.first_at,
         CASE WHEN fm.first_sender = c.owner_id THEN c.sitter_id ELSE c.owner_id END AS recipient
  FROM public.conversations c
  JOIN fm ON fm.conversation_id = c.id
  WHERE fm.first_at >= now() - interval '90 days'
    AND fm.first_sender IN (c.owner_id, c.sitter_id)
),
replied AS (
  SELECT r.recipient,
         r.sit_id,
         r.sitter_id,
         (
           SELECT MIN(m.created_at)
           FROM public.messages m
           WHERE m.conversation_id = r.conversation_id
             AND m.sender_id = r.recipient
             AND m.created_at > r.first_at
             AND m.is_system IS NOT TRUE
         ) AS reply_at,
         r.first_at
  FROM recv r
),
conv_stats AS (
  SELECT recipient AS uid,
         COUNT(*)::int AS conv_total,
         COUNT(reply_at)::int AS conv_replied,
         percentile_cont(0.5) WITHIN GROUP (
           ORDER BY EXTRACT(EPOCH FROM (reply_at - first_at)) / 60.0
         ) FILTER (WHERE reply_at IS NOT NULL) AS median_minutes
  FROM replied
  GROUP BY recipient
),
-- Candidatures reçues sans aucune conversation reçue rattachée (dédoublonnage :
-- si une conversation existe déjà pour ce couple annonce/gardien, elle est
-- déjà comptée ci-dessus, avec ou sans réponse du propriétaire).
orphan_apps AS (
  SELECT s.user_id AS uid, COUNT(*)::int AS orphan_total
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  WHERE a.created_at >= now() - interval '90 days'
    AND a.created_at <= now() - interval '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM recv r
      WHERE r.sit_id = a.sit_id AND r.sitter_id = a.sitter_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.messages m ON m.conversation_id = c.id
      WHERE c.sit_id = a.sit_id
        AND c.sitter_id = a.sitter_id
        AND m.sender_id = s.user_id
        AND m.is_system IS NOT TRUE
        AND m.created_at <= a.created_at + interval '7 days'
    )
  GROUP BY s.user_id
)
SELECT COALESCE(cs.uid, oa.uid) AS user_id,
       COALESCE(cs.conv_total, 0) + COALESCE(oa.orphan_total, 0) AS contacts_total,
       COALESCE(cs.conv_replied, 0) AS replied_count,
       CASE
         WHEN COALESCE(cs.conv_total, 0) + COALESCE(oa.orphan_total, 0) = 0 THEN 0
         ELSE ROUND(
           COALESCE(cs.conv_replied, 0)::numeric
           / (COALESCE(cs.conv_total, 0) + COALESCE(oa.orphan_total, 0))::numeric, 4)
       END AS response_rate,
       cs.median_minutes AS median_reply_minutes
FROM conv_stats cs
FULL OUTER JOIN orphan_apps oa ON oa.uid = cs.uid;
$$;

COMMENT ON FUNCTION public.compute_responsiveness_stats() IS
  'Réactivité sur 90 jours. Contacts reçus = conversations reçues + candidatures orphelines. Usage interne, ne jamais exposer les chiffres au public.';

-- Vue publique : uniquement le palier, jamais un chiffre.
DROP VIEW IF EXISTS public.public_responsiveness;
CREATE VIEW public.public_responsiveness AS
SELECT s.user_id,
       CASE
         WHEN s.median_reply_minutes < 60 THEN 'under_1h'
         WHEN s.median_reply_minutes < 360 THEN 'few_hours'
         WHEN s.median_reply_minutes < 1440 THEN 'under_1d'
         ELSE 'two_three_days'
       END AS tier
FROM public.compute_responsiveness_stats() s
WHERE s.contacts_total >= 5
  AND s.response_rate >= 0.70
  AND s.median_reply_minutes IS NOT NULL
  AND s.median_reply_minutes < 4320;

COMMENT ON VIEW public.public_responsiveness IS
  'Palier de réactivité affichable publiquement. Aucun taux, aucun délai brut.';

GRANT SELECT ON public.public_responsiveness TO anon, authenticated;
GRANT ALL ON public.public_responsiveness TO service_role;
