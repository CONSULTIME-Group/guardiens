-- Entraide, lot 3 : la fin d'echange et la preuve.
-- Colonnes additives, RPC de confirmation par jeton, vues publiques en lecture seule.

ALTER TABLE public.mission_feedbacks ADD COLUMN IF NOT EXISTS public_ok boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.mission_feedbacks.public_ok IS
  'Entraide : le mot laisse peut apparaitre dans la preuve publique « Ca s est passe pres de chez vous ».';

ALTER TABLE public.small_missions ADD COLUMN IF NOT EXISTS meetup_prompt_sent_at timestamptz;
COMMENT ON COLUMN public.small_missions.meetup_prompt_sent_at IS
  'Entraide : date d envoi de la relance de fin « Vous vous etes rencontres ? ». Anti-renvoi.';

ALTER TABLE public.small_mission_responses ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
COMMENT ON COLUMN public.small_mission_responses.accepted_at IS
  'Entraide : date d acceptation du « je peux ». NULL pour les lignes anterieures, on retombe alors sur created_at.';

ALTER TABLE public.badge_attributions ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES public.small_missions(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.badge_attributions.mission_id IS
  'Entraide : coup de main a l origine de l ecusson. NULL pour les ecussons de garde.';

CREATE UNIQUE INDEX IF NOT EXISTS badge_attributions_first_help_uniq
  ON public.badge_attributions (user_id)
  WHERE badge_id = 'coup_de_main_or';

-- Acceptation : on date desormais le « je peux » retenu.
CREATE OR REPLACE FUNCTION public.accept_mission_response(p_response_id uuid, p_decline_others boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_mission_id uuid;
  v_owner_id uuid;
  v_mission_status small_mission_status;
  v_mission_title text;
  v_responder_id uuid;
  v_resp_status small_mission_response_status;
  v_conv_id uuid;
  v_declined_ids uuid[] := ARRAY[]::uuid[];
  v_declined_count int := 0;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT r.mission_id, r.responder_id, r.status,
         m.user_id, m.status, m.title
    INTO v_mission_id, v_responder_id, v_resp_status,
         v_owner_id, v_mission_status, v_mission_title
  FROM public.small_mission_responses r
  JOIN public.small_missions m ON m.id = r.mission_id
  WHERE r.id = p_response_id;

  IF v_mission_id IS NULL THEN
    RAISE EXCEPTION 'response_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner_id <> v_me THEN
    RAISE EXCEPTION 'not_mission_owner' USING ERRCODE = '42501';
  END IF;

  IF v_resp_status <> 'pending' THEN
    RAISE EXCEPTION 'response_not_pending: %', v_resp_status USING ERRCODE = '22023';
  END IF;

  IF v_mission_status NOT IN ('open', 'in_progress') THEN
    RAISE EXCEPTION 'mission_closed: %', v_mission_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.small_mission_responses
     SET status = 'accepted', accepted_at = now()
   WHERE id = p_response_id;

  IF v_mission_status = 'open' THEN
    UPDATE public.small_missions
       SET status = 'in_progress', updated_at = now()
     WHERE id = v_mission_id;
  END IF;

  IF p_decline_others THEN
    WITH decl AS (
      UPDATE public.small_mission_responses
         SET status = 'declined'
       WHERE mission_id = v_mission_id
         AND id <> p_response_id
         AND status = 'pending'
       RETURNING responder_id
    )
    SELECT array_agg(responder_id), count(*) INTO v_declined_ids, v_declined_count FROM decl;
    v_declined_ids := COALESCE(v_declined_ids, ARRAY[]::uuid[]);
  END IF;

  v_conv_id := public.get_or_create_conversation(
    p_other_user_id := v_responder_id,
    p_context_type  := 'mission_help'::conversation_context,
    p_sit_id        := NULL,
    p_small_mission_id := v_mission_id
  );

  IF v_conv_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.messages
       WHERE conversation_id = v_conv_id
         AND is_system = true
         AND content LIKE 'Personne retenue pour%'
    ) THEN
      INSERT INTO public.messages (conversation_id, sender_id, content, is_system)
      VALUES (
        v_conv_id, v_me,
        'Personne retenue pour « ' || COALESCE(v_mission_title, 'ce coup de main') ||
        ' ». Vous pouvez maintenant échanger pour organiser l''entraide.',
        true
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'response_id', p_response_id,
    'mission_id', v_mission_id,
    'conversation_id', v_conv_id,
    'declined_count', v_declined_count,
    'declined_responder_ids', to_jsonb(v_declined_ids)
  );
END;
$function$;

-- Emission des deux jetons de fin d'echange, pour les deux personnes.
CREATE OR REPLACE FUNCTION public.emit_mission_meetup_tokens(p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m record;
  v_helper_id uuid;
  v_rows jsonb := '[]'::jsonb;
  v_person uuid;
  v_yes text;
  v_no text;
BEGIN
  SELECT s.id, s.user_id, s.title, s.city, s.status
    INTO m FROM public.small_missions s WHERE s.id = p_mission_id;
  IF m.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'mission_not_found'); END IF;
  IF m.status <> 'in_progress' THEN RETURN jsonb_build_object('ok', false, 'reason', 'mission_not_in_progress'); END IF;

  SELECT r.responder_id INTO v_helper_id
  FROM public.small_mission_responses r
  WHERE r.mission_id = p_mission_id AND r.status = 'accepted'
  ORDER BY r.accepted_at NULLS LAST, r.created_at
  LIMIT 1;

  IF v_helper_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_accepted_helper'); END IF;

  FOREACH v_person IN ARRAY ARRAY[m.user_id, v_helper_id] LOOP
    v_yes := NULL;
    v_no := NULL;

    SELECT token INTO v_yes FROM public.mission_action_tokens
     WHERE mission_id = p_mission_id AND helper_id = v_person AND action = 'meetup_yes' AND used_at IS NULL AND expires_at > now()
     LIMIT 1;
    IF v_yes IS NULL THEN
      INSERT INTO public.mission_action_tokens (mission_id, helper_id, action, token)
      VALUES (p_mission_id, v_person, 'meetup_yes', encode(gen_random_bytes(24), 'hex'))
      RETURNING token INTO v_yes;
    END IF;

    SELECT token INTO v_no FROM public.mission_action_tokens
     WHERE mission_id = p_mission_id AND helper_id = v_person AND action = 'meetup_no' AND used_at IS NULL AND expires_at > now()
     LIMIT 1;
    IF v_no IS NULL THEN
      INSERT INTO public.mission_action_tokens (mission_id, helper_id, action, token)
      VALUES (p_mission_id, v_person, 'meetup_no', encode(gen_random_bytes(24), 'hex'))
      RETURNING token INTO v_no;
    END IF;

    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'user_id', v_person,
      'role', CASE WHEN v_person = m.user_id THEN 'owner' ELSE 'helper' END,
      'yes_token', v_yes,
      'no_token', v_no
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'mission_id', m.id,
    'mission_title', COALESCE(m.title, ''),
    'mission_city', COALESCE(m.city, ''),
    'owner_id', m.user_id,
    'helper_id', v_helper_id,
    'people', v_rows
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.emit_mission_meetup_tokens(uuid) TO service_role;

-- Lecture d'un jeton de fin d'echange, sans effet de bord.
CREATE OR REPLACE FUNCTION public.peek_mission_meetup_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  m record;
  v_helper_id uuid;
  v_other uuid;
  v_other_name text;
BEGIN
  SELECT * INTO r FROM public.mission_action_tokens WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'invalid'); END IF;
  IF r.action NOT IN ('meetup_yes', 'meetup_no') THEN RETURN jsonb_build_object('valid', false, 'reason', 'invalid'); END IF;
  IF r.used_at IS NOT NULL THEN RETURN jsonb_build_object('valid', false, 'reason', 'already_used'); END IF;
  IF r.expires_at <= now() THEN RETURN jsonb_build_object('valid', false, 'reason', 'expired'); END IF;

  SELECT s.id, s.title, s.city, s.status, s.user_id INTO m
  FROM public.small_missions s WHERE s.id = r.mission_id;

  SELECT resp.responder_id INTO v_helper_id
  FROM public.small_mission_responses resp
  WHERE resp.mission_id = r.mission_id AND resp.status = 'accepted'
  ORDER BY resp.accepted_at NULLS LAST, resp.created_at LIMIT 1;

  v_other := CASE WHEN r.helper_id = m.user_id THEN v_helper_id ELSE m.user_id END;
  SELECT p.first_name INTO v_other_name FROM public.profiles p WHERE p.id = v_other;

  RETURN jsonb_build_object(
    'valid', true,
    'action', r.action,
    'mission_id', m.id,
    'mission_title', COALESCE(m.title, ''),
    'mission_city', COALESCE(m.city, ''),
    'other_first_name', COALESCE(v_other_name, ''),
    'already_answered', EXISTS (
      SELECT 1 FROM public.mission_feedbacks f
       WHERE f.mission_id = r.mission_id AND f.giver_id = r.helper_id
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.peek_mission_meetup_token(text) TO service_role;

-- Confirmation de la rencontre, usage unique, ecusson du premier coup de main.
-- La ligne « je peux » retenue reste telle quelle : son statut est protege par
-- les gardes de public.small_mission_responses, et l'historique de qui avait
-- ete retenu a de la valeur.
CREATE OR REPLACE FUNCTION public.confirm_mission_meetup(
  p_token text,
  p_word text DEFAULT NULL,
  p_public_ok boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  m record;
  v_helper_id uuid;
  v_other uuid;
  v_happened boolean;
  v_ref_date date;
  v_reopen boolean := false;
  v_badge_rows int := 0;
  v_word text;
BEGIN
  SELECT * INTO r FROM public.mission_action_tokens WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF r.action NOT IN ('meetup_yes', 'meetup_no') THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF r.used_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_used'); END IF;
  IF r.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;

  v_happened := (r.action = 'meetup_yes');

  SELECT s.id, s.user_id, s.title, s.status, s.date_needed, s.end_date INTO m
  FROM public.small_missions s WHERE s.id = r.mission_id FOR UPDATE;
  IF m.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;

  SELECT resp.responder_id INTO v_helper_id
  FROM public.small_mission_responses resp
  WHERE resp.mission_id = r.mission_id AND resp.status = 'accepted'
  ORDER BY resp.accepted_at NULLS LAST, resp.created_at LIMIT 1;

  v_other := CASE WHEN r.helper_id = m.user_id THEN v_helper_id ELSE m.user_id END;

  UPDATE public.mission_action_tokens SET used_at = now()
   WHERE mission_id = r.mission_id AND helper_id = r.helper_id
     AND action IN ('meetup_yes', 'meetup_no') AND used_at IS NULL;

  v_word := NULLIF(btrim(COALESCE(p_word, '')), '');
  IF v_word IS NOT NULL THEN v_word := left(v_word, 140); END IF;

  IF v_other IS NOT NULL THEN
    INSERT INTO public.mission_feedbacks (mission_id, giver_id, receiver_id, positive, comment, public_ok)
    VALUES (r.mission_id, r.helper_id, v_other, v_happened, v_word, COALESCE(p_public_ok, true))
    ON CONFLICT (mission_id, giver_id) DO UPDATE
      SET positive = EXCLUDED.positive,
          comment = COALESCE(EXCLUDED.comment, public.mission_feedbacks.comment),
          public_ok = EXCLUDED.public_ok;
  END IF;

  IF v_happened THEN
    IF v_helper_id IS NOT NULL AND r.helper_id = v_helper_id THEN
      INSERT INTO public.badge_attributions (user_id, badge_id, giver_id, mission_id, is_manual)
      VALUES (v_helper_id, 'coup_de_main_or', m.user_id, m.id, false)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_badge_rows = ROW_COUNT;
    END IF;

    UPDATE public.small_missions
       SET status = 'completed', closed_at = now(), close_reason = 'meetup_confirmed', updated_at = now()
     WHERE id = m.id AND status <> 'completed';
  ELSE
    v_ref_date := COALESCE(m.end_date, m.date_needed);
    v_reopen := v_ref_date IS NOT NULL AND v_ref_date >= CURRENT_DATE;

    IF v_reopen THEN
      UPDATE public.small_missions
         SET status = 'open', updated_at = now()
       WHERE id = m.id;
    ELSE
      UPDATE public.small_missions
         SET status = 'completed', closed_at = now(), close_reason = 'meetup_not_happened', updated_at = now()
       WHERE id = m.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'happened', v_happened,
    'mission_id', m.id,
    'mission_title', COALESCE(m.title, ''),
    'reopened', v_reopen,
    'badge_awarded', (v_badge_rows > 0),
    'helper_id', v_helper_id,
    'owner_id', m.user_id,
    'actor_id', r.helper_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.confirm_mission_meetup(text, text, boolean) TO service_role;

-- Preuve publique : prenoms, ville, mot autorise, date. Aucune identite complete.
CREATE OR REPLACE VIEW public.public_entraide_proofs AS
SELECT
  m.id AS mission_id,
  hp.first_name AS helper_first_name,
  op.first_name AS owner_first_name,
  m.city,
  round(m.latitude::numeric, 2)::double precision AS latitude_approx,
  round(m.longitude::numeric, 2)::double precision AS longitude_approx,
  (
    SELECT left(f2.comment, 140) FROM public.mission_feedbacks f2
     WHERE f2.mission_id = m.id AND f2.positive AND f2.public_ok
       AND btrim(COALESCE(f2.comment, '')) <> ''
     ORDER BY f2.created_at LIMIT 1
  ) AS word,
  (
    SELECT min(f3.created_at) FROM public.mission_feedbacks f3
     WHERE f3.mission_id = m.id AND f3.positive
  ) AS happened_at
FROM public.small_missions m
JOIN public.small_mission_responses r
  ON r.mission_id = m.id AND r.status = 'accepted'
JOIN public.profiles hp ON hp.id = r.responder_id
JOIN public.profiles op ON op.id = m.user_id
WHERE m.close_reason = 'meetup_confirmed'
  AND m.moderation_hidden_at IS NULL
  AND m.hidden_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.mission_feedbacks f
     WHERE f.mission_id = m.id AND f.positive
  );

GRANT SELECT ON public.public_entraide_proofs TO anon, authenticated;
GRANT ALL ON public.public_entraide_proofs TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_entraide_proofs FROM anon, authenticated, PUBLIC;

COMMENT ON VIEW public.public_entraide_proofs IS
  'Entraide : preuves publiques « Ca s est passe pres de chez vous ». Prenoms, ville, coordonnees arrondies, mot autorise. Vue possedee par postgres, lecture seule cote client.';

-- Compteurs de coups de main, donnes et recus.
CREATE OR REPLACE VIEW public.public_help_counts AS
WITH confirmed AS (
  SELECT m.id AS mission_id, m.user_id AS owner_id, r.responder_id AS helper_id
  FROM public.small_missions m
  JOIN public.small_mission_responses r ON r.mission_id = m.id AND r.status = 'accepted'
  WHERE m.close_reason = 'meetup_confirmed'
)
SELECT u.user_id,
       count(*) FILTER (WHERE u.kind = 'given')::integer AS given_count,
       count(*) FILTER (WHERE u.kind = 'received')::integer AS received_count
FROM (
  SELECT helper_id AS user_id, 'given'::text AS kind FROM confirmed
  UNION ALL
  SELECT owner_id AS user_id, 'received'::text AS kind FROM confirmed
) u
GROUP BY u.user_id;

GRANT SELECT ON public.public_help_counts TO anon, authenticated;
GRANT ALL ON public.public_help_counts TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_help_counts FROM anon, authenticated, PUBLIC;

COMMENT ON VIEW public.public_help_counts IS
  'Entraide : nombre de coups de main donnes et recus par membre, calcule sur les rencontres confirmees.';