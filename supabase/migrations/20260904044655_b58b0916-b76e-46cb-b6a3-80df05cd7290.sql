
DROP VIEW IF EXISTS public.public_responsiveness;
DROP FUNCTION IF EXISTS public.compute_responsiveness_stats();

-- Vue unique : calcul de réactivité sur 90 jours, exposition du seul palier.
CREATE VIEW public.public_responsiveness AS
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
         fm.first_at,
         CASE WHEN fm.first_sender = c.owner_id THEN c.sitter_id ELSE c.owner_id END AS recipient
  FROM public.conversations c
  JOIN fm ON fm.conversation_id = c.id
  WHERE fm.first_at >= now() - interval '90 days'
    AND fm.first_sender IN (c.owner_id, c.sitter_id)
),
replied AS (
  SELECT r.recipient,
         r.first_at,
         (
           SELECT MIN(m.created_at)
           FROM public.messages m
           WHERE m.conversation_id = r.conversation_id
             AND m.sender_id = r.recipient
             AND m.created_at > r.first_at
             AND m.is_system IS NOT TRUE
         ) AS reply_at
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
),
stats AS (
  SELECT COALESCE(cs.uid, oa.uid) AS user_id,
         COALESCE(cs.conv_total, 0) + COALESCE(oa.orphan_total, 0) AS contacts_total,
         COALESCE(cs.conv_replied, 0) AS replied_count,
         cs.median_minutes
  FROM conv_stats cs
  FULL OUTER JOIN orphan_apps oa ON oa.uid = cs.uid
)
SELECT user_id,
       CASE
         WHEN median_minutes < 60 THEN 'under_1h'
         WHEN median_minutes < 360 THEN 'few_hours'
         WHEN median_minutes < 1440 THEN 'under_1d'
         ELSE 'two_three_days'
       END AS tier
FROM stats
WHERE contacts_total >= 5
  AND median_minutes IS NOT NULL
  AND median_minutes < 4320
  AND replied_count::numeric / contacts_total::numeric >= 0.70;

COMMENT ON VIEW public.public_responsiveness IS
  'Palier de réactivité publiquement affichable (90 jours, min 5 contacts, taux >= 70 pourcent, mediane < 72 h). Aucun chiffre brut exposé.';

GRANT SELECT ON public.public_responsiveness TO anon, authenticated;
GRANT ALL ON public.public_responsiveness TO service_role;
