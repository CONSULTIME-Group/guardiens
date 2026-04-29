-- RPC: count unread messages addressed to the current user, scoped to their conversations
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.sender_id <> _user_id
    AND m.read_at IS NULL
    AND (c.owner_id = _user_id OR c.sitter_id = _user_id)
    AND NOT (_user_id = ANY(COALESCE(c.archived_by, '{}'::uuid[])));
$$;

REVOKE ALL ON FUNCTION public.get_unread_messages_count(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_unread_messages_count(uuid) TO authenticated;