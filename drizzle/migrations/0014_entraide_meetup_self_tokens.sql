-- Entraide, fin d'echange depuis le tableau de bord :
-- le membre concerne obtient ses propres jetons, sans passer par l'email.
CREATE OR REPLACE FUNCTION public.my_mission_meetup_tokens(p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_me uuid := auth.uid();
  m record;
  v_helper_id uuid;
  v_yes text;
  v_no text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT s.id, s.user_id, s.status INTO m FROM public.small_missions s WHERE s.id = p_mission_id;
  IF m.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'mission_not_found'); END IF;

  SELECT r.responder_id INTO v_helper_id
  FROM public.small_mission_responses r
  WHERE r.mission_id = p_mission_id AND r.status = 'accepted'
  ORDER BY r.accepted_at NULLS LAST, r.created_at LIMIT 1;

  IF v_me <> m.user_id AND (v_helper_id IS NULL OR v_me <> v_helper_id) THEN
    RAISE EXCEPTION 'not_a_participant' USING ERRCODE = '42501';
  END IF;

  IF m.status <> 'in_progress' THEN RETURN jsonb_build_object('ok', false, 'reason', 'mission_not_in_progress'); END IF;

  SELECT token INTO v_yes FROM public.mission_action_tokens
   WHERE mission_id = p_mission_id AND helper_id = v_me AND action = 'meetup_yes' AND used_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF v_yes IS NULL THEN
    INSERT INTO public.mission_action_tokens (mission_id, helper_id, action, token)
    VALUES (p_mission_id, v_me, 'meetup_yes', encode(gen_random_bytes(24), 'hex'))
    RETURNING token INTO v_yes;
  END IF;

  SELECT token INTO v_no FROM public.mission_action_tokens
   WHERE mission_id = p_mission_id AND helper_id = v_me AND action = 'meetup_no' AND used_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF v_no IS NULL THEN
    INSERT INTO public.mission_action_tokens (mission_id, helper_id, action, token)
    VALUES (p_mission_id, v_me, 'meetup_no', encode(gen_random_bytes(24), 'hex'))
    RETURNING token INTO v_no;
  END IF;

  RETURN jsonb_build_object('ok', true, 'yes_token', v_yes, 'no_token', v_no);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.my_mission_meetup_tokens(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_mission_meetup_tokens(uuid) TO service_role;