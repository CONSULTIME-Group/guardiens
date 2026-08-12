CREATE OR REPLACE FUNCTION public.admin_list_conversations(
  p_since timestamptz DEFAULT NULL,
  p_context text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_only_unanswered boolean DEFAULT false,
  p_unread_days integer DEFAULT NULL,
  p_sort text DEFAULT 'last_message',
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  conversation_id uuid,
  context_type text,
  sit_id uuid,
  sit_title text,
  small_mission_id uuid,
  mission_title text,
  owner_id uuid,
  owner_name text,
  owner_avatar text,
  sitter_id uuid,
  sitter_name text,
  sitter_avatar text,
  message_count bigint,
  human_count bigint,
  distinct_senders bigint,
  unread_count bigint,
  oldest_unread_at timestamptz,
  last_message_at timestamptz,
  last_message_excerpt text,
  last_sender_id uuid,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH guard AS (
    SELECT public.has_role(auth.uid(), 'admin'::app_role) AS ok
  ),
  agg AS (
    SELECT m.conversation_id,
           COUNT(*)::bigint AS message_count,
           COUNT(*) FILTER (WHERE NOT COALESCE(m.is_system, false))::bigint AS human_count,
           COUNT(DISTINCT m.sender_id) FILTER (WHERE NOT COALESCE(m.is_system, false))::bigint AS distinct_senders,
           COUNT(*) FILTER (WHERE m.read_at IS NULL AND NOT COALESCE(m.is_system, false))::bigint AS unread_count,
           MIN(m.created_at) FILTER (WHERE m.read_at IS NULL AND NOT COALESCE(m.is_system, false)) AS oldest_unread_at
    FROM public.messages m
    GROUP BY m.conversation_id
  ),
  base AS (
    SELECT c.id,
           COALESCE(c.context_type::text, 'private') AS ctx,
           c.sit_id, s.title AS sit_title,
           c.small_mission_id, sm.title AS mission_title,
           c.owner_id,
           COALESCE(NULLIF(TRIM(CONCAT_WS(' ', po.first_name, po.last_name)), ''), po.email, '-') AS owner_name,
           po.avatar_url AS owner_avatar,
           c.sitter_id,
           COALESCE(NULLIF(TRIM(CONCAT_WS(' ', ps.first_name, ps.last_name)), ''), ps.email, '-') AS sitter_name,
           ps.avatar_url AS sitter_avatar,
           COALESCE(a.message_count, 0) AS message_count,
           COALESCE(a.human_count, 0) AS human_count,
           COALESCE(a.distinct_senders, 0) AS distinct_senders,
           COALESCE(a.unread_count, 0) AS unread_count,
           a.oldest_unread_at,
           COALESCE(c.last_message_at, c.created_at) AS last_message_at,
           (SELECT LEFT(REGEXP_REPLACE(lm.content, '\s+', ' ', 'g'), 160)
              FROM public.messages lm
             WHERE lm.conversation_id = c.id
             ORDER BY lm.created_at DESC LIMIT 1) AS last_message_excerpt,
           (SELECT lm.sender_id FROM public.messages lm
             WHERE lm.conversation_id = c.id
             ORDER BY lm.created_at DESC LIMIT 1) AS last_sender_id,
           c.created_at
    FROM public.conversations c
    LEFT JOIN agg a ON a.conversation_id = c.id
    LEFT JOIN public.profiles po ON po.id = c.owner_id
    LEFT JOIN public.profiles ps ON ps.id = c.sitter_id
    LEFT JOIN public.sits s ON s.id = c.sit_id
    LEFT JOIN public.small_missions sm ON sm.id = c.small_mission_id
    WHERE (SELECT ok FROM guard)
      AND (p_since IS NULL OR COALESCE(c.last_message_at, c.created_at) >= p_since)
      AND (p_context IS NULL OR COALESCE(c.context_type::text, 'private') = p_context)
      AND (p_user_id IS NULL OR c.owner_id = p_user_id OR c.sitter_id = p_user_id)
      AND (NOT p_only_unanswered OR COALESCE(a.distinct_senders, 0) <= 1)
      AND (p_unread_days IS NULL OR (a.oldest_unread_at IS NOT NULL AND a.oldest_unread_at < now() - (p_unread_days || ' days')::interval))
  )
  SELECT b.id, b.ctx, b.sit_id, b.sit_title, b.small_mission_id, b.mission_title,
         b.owner_id, b.owner_name, b.owner_avatar,
         b.sitter_id, b.sitter_name, b.sitter_avatar,
         b.message_count, b.human_count, b.distinct_senders,
         b.unread_count, b.oldest_unread_at,
         b.last_message_at, b.last_message_excerpt, b.last_sender_id, b.created_at,
         COUNT(*) OVER ()::bigint AS total_count
  FROM base b
  ORDER BY
    CASE WHEN p_sort = 'unread_age' THEN b.oldest_unread_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'volume' THEN b.message_count END DESC NULLS LAST,
    b.last_message_at DESC NULLS LAST
  LIMIT GREATEST(COALESCE(p_limit, 25), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$function$;

REVOKE ALL ON FUNCTION public.admin_list_conversations(timestamptz, text, uuid, boolean, integer, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_conversations(timestamptz, text, uuid, boolean, integer, text, integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_conversation_search(p_query text)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, conv_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''), p.email, '-') AS full_name,
         p.avatar_url,
         (SELECT COUNT(*) FROM public.conversations c
           WHERE c.owner_id = p.id OR c.sitter_id = p.id)::bigint AS conv_count
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND COALESCE(p_query, '') <> ''
    AND (
      p.first_name ILIKE '%' || p_query || '%'
      OR p.last_name ILIKE '%' || p_query || '%'
      OR p.email ILIKE '%' || p_query || '%'
    )
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.owner_id = p.id OR c.sitter_id = p.id)
  ORDER BY conv_count DESC
  LIMIT 20;
$function$;

REVOKE ALL ON FUNCTION public.admin_conversation_search(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_conversation_search(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_conversation_hidden_messages(p_conversation_id uuid)
RETURNS TABLE(message_id uuid, moderation_hidden_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT m.id, m.moderation_hidden_at
  FROM public.messages m
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND m.conversation_id = p_conversation_id
    AND m.moderation_hidden_at IS NOT NULL;
$function$;

REVOKE ALL ON FUNCTION public.admin_conversation_hidden_messages(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_conversation_hidden_messages(uuid) TO authenticated, service_role;