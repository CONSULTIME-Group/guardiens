-- Lot MSG1 : la notification d'un message ouvre sa conversation.
-- Corps identique à la production du 02/11/2026, seul le lien change.
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_conv record;
  v_recipient_id uuid;
  v_sender_name text;
  v_sender_avatar text;
  v_sit_title text;
BEGIN
  IF NEW.is_system THEN RETURN NEW; END IF;

  SELECT c.owner_id, c.sitter_id, c.sit_id INTO v_conv
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  v_recipient_id := CASE WHEN v_conv.owner_id = NEW.sender_id THEN v_conv.sitter_id ELSE v_conv.owner_id END;

  SELECT p.first_name, p.avatar_url INTO v_sender_name, v_sender_avatar
  FROM public.profiles p WHERE p.id = NEW.sender_id;

  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_recipient_id
    AND type = 'new_message'
    AND read_at IS NULL
    AND created_at > now() - interval '30 minutes'
    AND body LIKE '%' || coalesce(v_sender_name, '') || '%'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    v_recipient_id,
    'new_message',
    'Nouveau message',
    coalesce(v_sender_name, 'Quelqu''un') || ' vous a envoyé un message',
    '/messages/' || NEW.conversation_id::text,
    v_sender_name,
    v_sender_avatar
  );
  RETURN NEW;
END;
$function$;
