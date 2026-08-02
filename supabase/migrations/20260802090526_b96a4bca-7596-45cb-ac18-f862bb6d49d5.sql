-- 1. Contrainte de statuts du journal d'envoi d'emails (idempotent)
ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
  CHECK (status IN (
    'pending','sent','dlq','suppressed','failed','bounced','complained',
    'abandoned','deferred','unsubscribed_category','rate_limited'
  ));

-- 2. admin_send_message_to_user sans long_stay_id (colonne supprimee le 05/07/2026)
CREATE OR REPLACE FUNCTION public.admin_send_message_to_user(p_target_user_id uuid, p_content text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_conv_id uuid;
  v_message_id uuid;
  v_recipient_email text;
  v_recipient_name text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  IF v_admin = p_target_user_id THEN
    RAISE EXCEPTION 'Impossible d''envoyer un message à soi-même';
  END IF;

  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Le message ne peut pas être vide';
  END IF;

  IF length(p_content) > 5000 THEN
    RAISE EXCEPTION 'Le message ne peut pas dépasser 5000 caractères';
  END IF;

  -- Conversation existante admin vers user sans contexte, dans les deux sens.
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE owner_id = v_admin
    AND sitter_id = p_target_user_id
    AND sit_id IS NULL
    AND small_mission_id IS NULL
    AND context_type IS NULL
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    SELECT id INTO v_conv_id
    FROM public.conversations
    WHERE owner_id = p_target_user_id
      AND sitter_id = v_admin
      AND sit_id IS NULL
      AND small_mission_id IS NULL
      AND context_type IS NULL
    LIMIT 1;
  END IF;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (owner_id, sitter_id, context_type)
    VALUES (v_admin, p_target_user_id, NULL)
    RETURNING id INTO v_conv_id;
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, is_system)
  VALUES (v_conv_id, v_admin, p_content, false)
  RETURNING id INTO v_message_id;

  SELECT p.email, NULLIF(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), '')
    INTO v_recipient_email, v_recipient_name
  FROM public.profiles p
  WHERE p.id = p_target_user_id;

  BEGIN
    INSERT INTO public.admin_message_logs (
      admin_id, recipient_id, recipient_email, recipient_name,
      conversation_id, message_id, content
    ) VALUES (
      v_admin, p_target_user_id, v_recipient_email, v_recipient_name,
      v_conv_id, v_message_id, p_content
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_message_logs insert failed: %', SQLERRM;
  END;

  RETURN v_conv_id;
END;
$function$;