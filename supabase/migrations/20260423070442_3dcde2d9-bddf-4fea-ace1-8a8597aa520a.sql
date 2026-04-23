-- RPC pour permettre à un admin d'envoyer un message à n'importe quel utilisateur
-- Crée (ou réutilise) une conversation admin↔user sans contexte spécifique
CREATE OR REPLACE FUNCTION public.admin_send_message_to_user(
  p_target_user_id uuid,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_conv_id uuid;
  v_message_id uuid;
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

  -- Cherche une conversation existante admin↔user sans contexte
  -- (admin = owner_id par convention, user cible = sitter_id)
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE owner_id = v_admin
    AND sitter_id = p_target_user_id
    AND sit_id IS NULL
    AND small_mission_id IS NULL
    AND long_stay_id IS NULL
    AND context_type IS NULL
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    -- Cherche aussi dans le sens inverse (au cas où l'utilisateur aurait initié)
    SELECT id INTO v_conv_id
    FROM public.conversations
    WHERE owner_id = p_target_user_id
      AND sitter_id = v_admin
      AND sit_id IS NULL
      AND small_mission_id IS NULL
      AND long_stay_id IS NULL
      AND context_type IS NULL
    LIMIT 1;
  END IF;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (owner_id, sitter_id, context_type)
    VALUES (v_admin, p_target_user_id, NULL)
    RETURNING id INTO v_conv_id;
  END IF;

  -- Insère le message au nom de l'admin
  INSERT INTO public.messages (conversation_id, sender_id, content, is_system)
  VALUES (v_conv_id, v_admin, p_content, false)
  RETURNING id INTO v_message_id;

  RETURN v_conv_id;
END;
$$;