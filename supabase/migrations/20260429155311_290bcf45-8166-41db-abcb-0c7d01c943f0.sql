-- Index partiel: cible les messages non lus uniquement (très petit sous-ensemble en pratique)
-- Inclut sender_id pour permettre un filtrage indexé sur "pas mes propres messages"
CREATE INDEX IF NOT EXISTS idx_messages_unread_by_conv
  ON public.messages (conversation_id, sender_id)
  WHERE read_at IS NULL;

-- Réécriture de la fonction:
-- - UNION ALL sur (owner_id) puis (sitter_id) pour exploiter idx_conversations_owner / _sitter
--   (un OR sur deux colonnes empêche souvent le planner d'utiliser les index)
-- - Filtre archived_by appliqué au niveau conversation
-- - Le JOIN exploite idx_messages_unread_by_conv (index partiel WHERE read_at IS NULL)
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(cnt), 0)::int FROM (
    SELECT COUNT(*) AS cnt
    FROM public.conversations c
    JOIN public.messages m
      ON m.conversation_id = c.id
     AND m.read_at IS NULL
     AND m.sender_id <> _user_id
    WHERE c.owner_id = _user_id
      AND NOT (_user_id = ANY(COALESCE(c.archived_by, '{}'::uuid[])))
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.conversations c
    JOIN public.messages m
      ON m.conversation_id = c.id
     AND m.read_at IS NULL
     AND m.sender_id <> _user_id
    WHERE c.sitter_id = _user_id
      AND c.owner_id IS DISTINCT FROM _user_id  -- évite double comptage si owner = sitter
      AND NOT (_user_id = ANY(COALESCE(c.archived_by, '{}'::uuid[])))
  ) s;
$function$;