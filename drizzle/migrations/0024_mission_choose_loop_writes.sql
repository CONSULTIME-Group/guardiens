CREATE OR REPLACE FUNCTION public.open_mission_response_conversation(p_response_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid := auth.uid();
  r record;
  v_conv uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT resp.id, resp.mission_id, resp.responder_id, resp.conversation_id, m.user_id AS owner_id
    INTO r
    FROM public.small_mission_responses resp
    JOIN public.small_missions m ON m.id = resp.mission_id
   WHERE resp.id = p_response_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'response_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_me <> r.owner_id AND v_me <> r.responder_id THEN RAISE EXCEPTION 'not_participant' USING ERRCODE = '42501'; END IF;
  IF r.conversation_id IS NOT NULL THEN RETURN r.conversation_id; END IF;

  SELECT c.id INTO v_conv FROM public.conversations c
   WHERE c.small_mission_id = r.mission_id
     AND ((c.owner_id = r.owner_id AND c.sitter_id = r.responder_id) OR (c.owner_id = r.responder_id AND c.sitter_id = r.owner_id))
   ORDER BY c.last_message_at DESC NULLS LAST
   LIMIT 1;
  IF v_conv IS NULL THEN
    v_conv := public.get_or_create_conversation(
      p_other_user_id := CASE WHEN v_me = r.owner_id THEN r.responder_id ELSE r.owner_id END,
      p_context_type := 'mission_help'::conversation_context,
      p_sit_id := NULL,
      p_small_mission_id := r.mission_id);
  END IF;
  -- Les gardes de la table réservent ce champ au répondant : écriture en son nom.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', r.responder_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', r.responder_id::text, true);
  UPDATE public.small_mission_responses SET conversation_id = v_conv WHERE id = r.id AND conversation_id IS NULL;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_me, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_me::text, true);
  RETURN v_conv;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_mission_choose_prompt_sent(p_response_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_responder uuid;
  v_count integer;
BEGIN
  SELECT responder_id INTO v_responder FROM public.small_mission_responses WHERE id = p_response_id;
  IF v_responder IS NULL THEN RETURN false; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_responder, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_responder::text, true);
  UPDATE public.small_mission_responses SET choose_prompt_sent_at = now()
   WHERE id = p_response_id AND choose_prompt_sent_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$function$;
REVOKE ALL ON FUNCTION public.mark_mission_choose_prompt_sent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_mission_choose_prompt_sent(uuid) TO service_role;