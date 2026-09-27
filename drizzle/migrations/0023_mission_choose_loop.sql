-- Sauvegarde avant rattachement des conversations existantes (27/09/2026)
CREATE TABLE IF NOT EXISTS public._backup_mission_conv_link_20260927 AS
SELECT 'conversation'::text AS kind, c.id, c.small_mission_id AS previous_value, now() AS saved_at
  FROM public.conversations c
 WHERE c.id IN ('e16fa803-6cdf-422f-a876-8400917ad245','b84e363d-6491-4ab3-9196-e3c94ba80e28','9c580a46-fe7b-45fa-b6b2-9d44db16bbf2')
UNION ALL
SELECT 'response'::text, r.id, r.conversation_id, now()
  FROM public.small_mission_responses r
 WHERE r.id IN ('9325d7d3-fe53-463b-a8f9-a62d5e45582c','0fae2df9-a717-4855-b69f-e604586524d6','c8f88b62-830c-4d0d-b143-543f574f80af');
ALTER TABLE public._backup_mission_conv_link_20260927 ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public._backup_mission_conv_link_20260927 TO service_role;

-- Relance « C'est {prénom} qui vous aide ? » : une seule par réponse.
ALTER TABLE public.small_mission_responses ADD COLUMN IF NOT EXISTS choose_prompt_sent_at timestamptz NULL;

-- Conversation liée au besoin, ouverte depuis la carte de réponse.
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
  UPDATE public.small_mission_responses SET conversation_id = v_conv WHERE id = r.id AND conversation_id IS NULL;
  RETURN v_conv;
END;
$function$;
REVOKE ALL ON FUNCTION public.open_mission_response_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_mission_response_conversation(uuid) TO authenticated;

-- Jeton email « Choisir {prénom} », rangé dans mission_action_tokens (action 'choose').
CREATE OR REPLACE FUNCTION public.emit_mission_choose_token(p_response_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r record;
  v_token text;
BEGIN
  SELECT resp.id, resp.mission_id, resp.responder_id INTO r
    FROM public.small_mission_responses resp WHERE resp.id = p_response_id AND resp.status = 'pending';
  IF r.id IS NULL THEN RETURN NULL; END IF;
  SELECT token INTO v_token FROM public.mission_action_tokens
   WHERE mission_id = r.mission_id AND helper_id = r.responder_id AND action = 'choose'
     AND used_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF v_token IS NULL THEN
    INSERT INTO public.mission_action_tokens (mission_id, helper_id, action, token, expires_at)
    VALUES (r.mission_id, r.responder_id, 'choose', encode(gen_random_bytes(24), 'hex'), now() + interval '14 days')
    RETURNING token INTO v_token;
  END IF;
  RETURN v_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.peek_mission_choose_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t record;
  m record;
  v_status small_mission_response_status;
  v_name text;
BEGIN
  SELECT * INTO t FROM public.mission_action_tokens WHERE token = p_token AND action = 'choose';
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'invalid'); END IF;
  IF t.used_at IS NOT NULL THEN RETURN jsonb_build_object('valid', false, 'reason', 'already_used'); END IF;
  IF t.expires_at <= now() THEN RETURN jsonb_build_object('valid', false, 'reason', 'expired'); END IF;
  SELECT s.id, s.title, s.slug, s.status INTO m FROM public.small_missions s WHERE s.id = t.mission_id;
  SELECT status INTO v_status FROM public.small_mission_responses WHERE mission_id = t.mission_id AND responder_id = t.helper_id;
  IF m.status NOT IN ('open', 'in_progress') OR v_status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'mission_closed', 'mission_slug', coalesce(m.slug, m.id::text));
  END IF;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = t.helper_id;
  RETURN jsonb_build_object('valid', true, 'mission_title', coalesce(m.title, ''), 'mission_slug', coalesce(m.slug, m.id::text),
    'helper_first_name', split_part(coalesce(v_name, ''), ' ', 1));
END;
$function$;

-- Exécute le choix au nom du demandeur : même fonction accept_mission_response,
-- l'identité du demandeur est posée pour la seule transaction.
CREATE OR REPLACE FUNCTION public.consume_mission_choose_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t record;
  v_owner uuid;
  v_response uuid;
  v_result jsonb;
BEGIN
  SELECT * INTO t FROM public.mission_action_tokens WHERE token = p_token AND action = 'choose' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF t.used_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_used'); END IF;
  IF t.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  SELECT user_id INTO v_owner FROM public.small_missions WHERE id = t.mission_id;
  SELECT id INTO v_response FROM public.small_mission_responses
   WHERE mission_id = t.mission_id AND responder_id = t.helper_id AND status = 'pending';
  IF v_owner IS NULL OR v_response IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'mission_closed'); END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  v_result := public.accept_mission_response(v_response, false);
  UPDATE public.mission_action_tokens SET used_at = now() WHERE id = t.id;
  RETURN jsonb_build_object('ok', true, 'mission_id', t.mission_id, 'response_id', v_response, 'accept', v_result);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'error', 'detail', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.emit_mission_choose_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.peek_mission_choose_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_mission_choose_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emit_mission_choose_token(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.peek_mission_choose_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_mission_choose_token(text) TO service_role;

-- Candidats à la relance : réponse en attente, besoin ouvert, les deux ont écrit
-- dans une conversation du couple après la réponse, premier échange il y a 48 h,
-- et ce premier échange postérieur à la mise en service (27/09/2026).
CREATE OR REPLACE FUNCTION public.mission_choose_prompt_candidates()
 RETURNS TABLE(response_id uuid, mission_id uuid, mission_title text, owner_id uuid, responder_id uuid, exchanged_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH pairs AS (
    SELECT r.id AS response_id, r.mission_id, m.title, m.user_id AS owner_id, r.responder_id, r.created_at
      FROM public.small_mission_responses r
      JOIN public.small_missions m ON m.id = r.mission_id
     WHERE r.status = 'pending' AND r.choose_prompt_sent_at IS NULL
       AND m.status = 'open' AND m.mission_type = 'besoin'
  ), firsts AS (
    SELECT p.*,
      (SELECT min(x.created_at) FROM public.messages x JOIN public.conversations c ON c.id = x.conversation_id
        WHERE ((c.owner_id = p.owner_id AND c.sitter_id = p.responder_id) OR (c.owner_id = p.responder_id AND c.sitter_id = p.owner_id))
          AND x.sender_id = p.owner_id AND x.created_at >= p.created_at) AS owner_first,
      (SELECT min(x.created_at) FROM public.messages x JOIN public.conversations c ON c.id = x.conversation_id
        WHERE ((c.owner_id = p.owner_id AND c.sitter_id = p.responder_id) OR (c.owner_id = p.responder_id AND c.sitter_id = p.owner_id))
          AND x.sender_id = p.responder_id AND x.created_at >= p.created_at) AS responder_first
      FROM pairs p
  )
  SELECT response_id, mission_id, title, owner_id, responder_id, greatest(owner_first, responder_first)
    FROM firsts
   WHERE owner_first IS NOT NULL AND responder_first IS NOT NULL
     AND greatest(owner_first, responder_first) >= timestamptz '2026-09-27 00:00:00+00'
     AND greatest(owner_first, responder_first) <= now() - interval '48 hours';
$function$;
REVOKE ALL ON FUNCTION public.mission_choose_prompt_candidates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mission_choose_prompt_candidates() TO service_role;