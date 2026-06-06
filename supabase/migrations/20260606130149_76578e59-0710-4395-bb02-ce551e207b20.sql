
-- 1) Funnel brouillons / publiées / confirmées / terminées / annulées, par période
CREATE OR REPLACE FUNCTION public.admin_get_sits_status_counts(p_since timestamptz DEFAULT NULL)
RETURNS TABLE(status text, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.status::text, COUNT(*)::bigint
  FROM public.sits s
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND (p_since IS NULL OR s.created_at >= p_since)
  GROUP BY s.status;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_sits_status_counts(timestamptz) TO authenticated;

-- 2) Candidatures d'une annonce
CREATE OR REPLACE FUNCTION public.admin_get_listing_applications(p_sit_id uuid)
RETURNS TABLE(
  application_id uuid,
  sitter_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  message text,
  status text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.sitter_id, p.first_name, p.last_name, p.avatar_url,
         a.message, a.status::text, a.created_at
  FROM public.applications a
  LEFT JOIN public.profiles p ON p.id = a.sitter_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND a.sit_id = p_sit_id
  ORDER BY a.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_listing_applications(uuid) TO authenticated;

-- 3) Conversations rattachées à une annonce
CREATE OR REPLACE FUNCTION public.admin_get_listing_conversations(p_sit_id uuid)
RETURNS TABLE(
  conversation_id uuid,
  owner_id uuid,
  owner_name text,
  owner_avatar text,
  sitter_id uuid,
  sitter_name text,
  sitter_avatar text,
  message_count bigint,
  last_message_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id,
         c.owner_id,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', po.first_name, po.last_name)), ''), po.email, '—') AS owner_name,
         po.avatar_url,
         c.sitter_id,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', ps.first_name, ps.last_name)), ''), ps.email, '—') AS sitter_name,
         ps.avatar_url,
         (SELECT COUNT(*) FROM public.messages m WHERE m.conversation_id = c.id)::bigint,
         c.last_message_at,
         c.created_at
  FROM public.conversations c
  LEFT JOIN public.profiles po ON po.id = c.owner_id
  LEFT JOIN public.profiles ps ON ps.id = c.sitter_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND c.sit_id = p_sit_id
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_listing_conversations(uuid) TO authenticated;

-- 4) Messages d'une conversation (lecture admin)
CREATE OR REPLACE FUNCTION public.admin_get_conversation_messages(p_conversation_id uuid)
RETURNS TABLE(
  message_id uuid,
  sender_id uuid,
  sender_name text,
  sender_avatar text,
  content text,
  photo_url text,
  is_system boolean,
  created_at timestamptz,
  read_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.sender_id,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''), p.email, '—'),
         p.avatar_url,
         m.content, m.photo_url, m.is_system, m.created_at, m.read_at
  FROM public.messages m
  LEFT JOIN public.profiles p ON p.id = m.sender_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_conversation_messages(uuid) TO authenticated;
