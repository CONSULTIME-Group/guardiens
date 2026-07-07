-- Alma interactivité — RPCs métriques réelles pour les whispers actionnables.
-- Toutes les fonctions sont SECURITY DEFINER, exposent uniquement des compteurs
-- agrégés, et restreignent l'accès aux données pertinentes.

-- 1) Vues d'une annonce sur 7 jours, visibles côté gardien authentifié.
--    Ne retourne un chiffre QUE si l'annonce est publiée. Sinon NULL.
CREATE OR REPLACE FUNCTION public.get_sit_view_count_week(p_sit_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.sits s WHERE s.id = p_sit_id AND s.status = 'published')
    THEN (
      SELECT COUNT(*)::bigint
      FROM public.analytics_events ae
      WHERE ae.event_type = 'sit_view'
        AND (ae.metadata->>'sit_id')::uuid = p_sit_id
        AND ae.created_at > now() - interval '7 days'
    )
    ELSE NULL
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sit_view_count_week(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sit_view_count_week(uuid) TO authenticated;

-- 2) Tendance vues semaine sur semaine pour les annonces d'un owner.
--    Restreint à l'owner lui-même (auth.uid() = p_user_id).
CREATE OR REPLACE FUNCTION public.get_owner_sits_view_trend(p_user_id uuid)
RETURNS TABLE(sit_id uuid, views_this_week bigint, views_last_week bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH owned AS (
    SELECT id FROM public.sits
    WHERE user_id = p_user_id
      AND user_id = auth.uid()
      AND status = 'published'
  )
  SELECT
    o.id AS sit_id,
    COUNT(*) FILTER (
      WHERE ae.event_type = 'sit_view'
        AND ae.created_at > now() - interval '7 days'
    )::bigint AS views_this_week,
    COUNT(*) FILTER (
      WHERE ae.event_type = 'sit_view'
        AND ae.created_at > now() - interval '14 days'
        AND ae.created_at <= now() - interval '7 days'
    )::bigint AS views_last_week
  FROM owned o
  LEFT JOIN public.analytics_events ae
    ON ae.event_type = 'sit_view'
   AND (ae.metadata->>'sit_id')::uuid = o.id
  GROUP BY o.id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_owner_sits_view_trend(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_owner_sits_view_trend(uuid) TO authenticated;

-- 3) Latence médiane de première réponse d'un owner (en minutes).
--    Retourne NULL si moins de 3 conversations exploitables sur 90 jours.
CREATE OR REPLACE FUNCTION public.get_owner_response_median_minutes(p_owner_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH conv AS (
    SELECT c.id, c.owner_id
    FROM public.conversations c
    WHERE c.owner_id = p_owner_id
      AND c.created_at > now() - interval '90 days'
  ),
  first_other AS (
    SELECT m.conversation_id, MIN(m.created_at) AS first_other_at
    FROM public.messages m
    JOIN conv ON conv.id = m.conversation_id
    WHERE m.sender_id <> conv.owner_id
      AND COALESCE(m.is_system, false) = false
    GROUP BY m.conversation_id
  ),
  first_owner_reply AS (
    SELECT m.conversation_id, MIN(m.created_at) AS reply_at
    FROM public.messages m
    JOIN first_other fo ON fo.conversation_id = m.conversation_id
    JOIN conv ON conv.id = m.conversation_id
    WHERE m.sender_id = conv.owner_id
      AND COALESCE(m.is_system, false) = false
      AND m.created_at > fo.first_other_at
    GROUP BY m.conversation_id
  ),
  deltas AS (
    SELECT EXTRACT(EPOCH FROM (fr.reply_at - fo.first_other_at)) / 60.0 AS minutes
    FROM first_owner_reply fr
    JOIN first_other fo USING (conversation_id)
  )
  SELECT CASE
    WHEN COUNT(*) >= 3
    THEN percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes)::integer
    ELSE NULL
  END
  FROM deltas;
$$;

REVOKE EXECUTE ON FUNCTION public.get_owner_response_median_minutes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_owner_response_median_minutes(uuid) TO authenticated;

-- 4) Stats de gardes d'un sitter : total + longues (>= 7 jours).
--    Utilise la même source que profiles.completed_sits_count (reviews validées).
CREATE OR REPLACE FUNCTION public.get_sitter_stay_stats(p_sitter_id uuid)
RETURNS TABLE(completed_sits bigint, long_stays bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH completed AS (
    SELECT DISTINCT r.sit_id
    FROM public.reviews r
    WHERE r.reviewee_id = p_sitter_id
      AND r.sit_id IS NOT NULL
      AND r.published = true
      AND r.moderation_status = 'valide'
      AND r.review_type <> 'annulation'
  )
  SELECT
    COUNT(*)::bigint AS completed_sits,
    COUNT(*) FILTER (
      WHERE s.start_date IS NOT NULL
        AND s.end_date IS NOT NULL
        AND (s.end_date - s.start_date) >= 7
    )::bigint AS long_stays
  FROM completed c
  LEFT JOIN public.sits s ON s.id = c.sit_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sitter_stay_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sitter_stay_stats(uuid) TO authenticated;
