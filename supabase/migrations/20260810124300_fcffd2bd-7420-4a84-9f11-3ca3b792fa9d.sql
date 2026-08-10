DROP FUNCTION IF EXISTS public.detect_unconfirmed_sits();

CREATE OR REPLACE FUNCTION public.detect_unconfirmed_sits(p_silence_days integer DEFAULT 3)
 RETURNS TABLE(sit_id uuid, sit_title text, sit_slug text, start_date date, end_date date, days_until_start integer, owner_id uuid, owner_first_name text, owner_email text, sitter_first_names text[], discussing_count integer, last_message_at timestamp with time zone, urgency text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH qualifying AS (
    SELECT
      a.sit_id,
      a.sitter_id,
      sp.first_name AS sitter_first_name,
      lm.last_at
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id AND s.status = 'published'
    JOIN public.profiles sp ON sp.id = a.sitter_id
    JOIN public.conversations c ON c.sit_id = a.sit_id AND c.sitter_id = a.sitter_id
    CROSS JOIN LATERAL (
      SELECT
        max(m.created_at) AS last_at,
        bool_or(m.sender_id = c.owner_id) AS owner_wrote,
        bool_or(m.sender_id = c.sitter_id) AS sitter_wrote
      FROM public.messages m
      WHERE m.conversation_id = c.id
        AND m.is_system = false
        AND m.moderation_hidden_at IS NULL
    ) lm
    WHERE a.status IN ('pending', 'viewed', 'discussing')
      AND lm.owner_wrote
      AND lm.sitter_wrote
  )
  SELECT
    s.id,
    s.title,
    s.slug,
    s.start_date,
    s.end_date,
    CASE WHEN s.start_date IS NULL THEN NULL
         ELSE (s.start_date - CURRENT_DATE)::int END,
    s.user_id,
    op.first_name,
    u.email::text,
    array_agg(DISTINCT q.sitter_first_name) FILTER (WHERE q.sitter_first_name IS NOT NULL),
    count(*)::int,
    max(q.last_at),
    CASE
      WHEN s.start_date IS NOT NULL AND (s.start_date - CURRENT_DATE) <= 14 THEN 'imminent'
      ELSE 'stale'
    END
  FROM qualifying q
  JOIN public.sits s ON s.id = q.sit_id
  JOIN public.profiles op ON op.id = s.user_id
  JOIN auth.users u ON u.id = s.user_id
  WHERE u.email IS NOT NULL
  GROUP BY s.id, s.title, s.slug, s.start_date, s.end_date, s.user_id, op.first_name, u.email
  HAVING max(q.last_at) < now() - make_interval(days => greatest(p_silence_days, 1))
      OR (s.start_date IS NOT NULL AND (s.start_date - CURRENT_DATE) <= 14)
$function$;

REVOKE ALL ON FUNCTION public.detect_unconfirmed_sits(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_unconfirmed_sits(integer) TO service_role;