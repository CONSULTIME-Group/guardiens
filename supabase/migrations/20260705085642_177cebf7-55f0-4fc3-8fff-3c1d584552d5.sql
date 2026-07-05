
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_other_user_id uuid,
  p_context_type conversation_context,
  p_sit_id uuid DEFAULT NULL,
  p_small_mission_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_owner_id uuid;
  v_sitter_id uuid;
  v_conv_id uuid;
  v_accept_pitches boolean;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF v_me = p_other_user_id THEN
    RAISE EXCEPTION 'Impossible de démarrer une conversation avec soi-même';
  END IF;

  IF p_context_type = 'sit_application' THEN
    IF p_sit_id IS NOT NULL THEN
      SELECT user_id INTO v_owner_id FROM sits WHERE id = p_sit_id;
    END IF;
    IF v_owner_id IS NULL THEN
      RAISE EXCEPTION 'Annonce introuvable';
    END IF;
    IF v_owner_id <> v_me AND v_owner_id <> p_other_user_id THEN
      RAISE EXCEPTION 'Vous ne participez pas à cette annonce';
    END IF;
    v_sitter_id := CASE WHEN v_owner_id = v_me THEN p_other_user_id ELSE v_me END;

  ELSIF p_context_type = 'mission_help' THEN
    IF p_small_mission_id IS NOT NULL THEN
      SELECT user_id INTO v_owner_id FROM small_missions WHERE id = p_small_mission_id;
    END IF;
    IF v_owner_id IS NULL THEN
      RAISE EXCEPTION 'Mission introuvable';
    END IF;
    v_sitter_id := CASE WHEN v_owner_id = v_me THEN p_other_user_id ELSE v_me END;

  ELSIF p_context_type = 'sitter_inquiry' THEN
    v_owner_id := v_me;
    v_sitter_id := p_other_user_id;

  ELSIF p_context_type = 'owner_pitch' THEN
    SELECT accept_unsolicited_pitches INTO v_accept_pitches
    FROM owner_profiles WHERE user_id = p_other_user_id;
    IF NOT COALESCE(v_accept_pitches, false) THEN
      RAISE EXCEPTION 'Ce membre ne reçoit pas de propositions spontanées' USING ERRCODE = 'P0001';
    END IF;
    v_owner_id := p_other_user_id;
    v_sitter_id := v_me;
  END IF;

  IF v_owner_id IS NULL OR v_sitter_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de résoudre les participants';
  END IF;
  IF v_owner_id = v_sitter_id THEN
    RAISE EXCEPTION 'Impossible de démarrer une conversation avec soi-même';
  END IF;

  IF p_sit_id IS NOT NULL THEN
    SELECT id INTO v_conv_id FROM conversations
    WHERE sit_id = p_sit_id AND owner_id = v_owner_id AND sitter_id = v_sitter_id LIMIT 1;
  ELSIF p_small_mission_id IS NOT NULL THEN
    SELECT id INTO v_conv_id FROM conversations
    WHERE small_mission_id = p_small_mission_id AND owner_id = v_owner_id AND sitter_id = v_sitter_id LIMIT 1;
  ELSE
    SELECT id INTO v_conv_id FROM conversations
    WHERE owner_id = v_owner_id AND sitter_id = v_sitter_id
      AND sit_id IS NULL AND small_mission_id IS NULL
      AND context_type = p_context_type
    LIMIT 1;
  END IF;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  INSERT INTO conversations (owner_id, sitter_id, sit_id, small_mission_id, context_type)
  VALUES (v_owner_id, v_sitter_id, p_sit_id, p_small_mission_id, p_context_type)
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$function$;
