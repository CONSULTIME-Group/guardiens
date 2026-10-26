-- Lot E24 « Une question en public, une proposition d'aide en privé »
-- (26/10/2026, maquette Claude Design « Entraide, questions publiques sur un
-- besoin », go de Jérémie ; remplace le sujet « La communauté » côté entraide).
--
-- Une question se pose sur la fiche d'un besoin et se lit par tous ; l'auteur
-- du besoin y répond sous la question. Le « Je peux » reste privé.
--
-- Écriture : uniquement par la fonction serveur mission-question (clé de
-- service), qui vérifie le compte, le besoin, les plafonds et la modération
-- avant d'enregistrer. Aucun droit d'écriture pour anon ni authenticated.
-- Lecture : uniquement par get_mission_questions, qui ne livre en public que
-- les textes passés en modération « ok » ; la personne qui pose la question et
-- l'auteur du besoin voient aussi les textes gardés privés par la modération.
--
-- La liste des emails dont le bouton ouvre une session gagne les deux emails
-- immédiats des questions (question reçue, réponse reçue).
-- Rejouable.

CREATE TABLE IF NOT EXISTS public.mission_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.small_missions(id) ON DELETE CASCADE,
  asker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 5 AND 280),
  moderation text NOT NULL CHECK (moderation IN ('ok', 'private')),
  answer text CHECK (answer IS NULL OR char_length(btrim(answer)) BETWEEN 1 AND 500),
  answer_moderation text CHECK (answer_moderation IS NULL OR answer_moderation IN ('ok', 'private')),
  answered_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mission_questions_answer_coherent CHECK (
    (answer IS NULL AND answer_moderation IS NULL AND answered_at IS NULL)
    OR (answer IS NOT NULL AND answer_moderation IS NOT NULL AND answered_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS mission_questions_mission_idx
  ON public.mission_questions (mission_id, created_at);
CREATE INDEX IF NOT EXISTS mission_questions_asker_idx
  ON public.mission_questions (asker_id, created_at);

ALTER TABLE public.mission_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mission_questions FROM anon, authenticated;
GRANT ALL ON public.mission_questions TO service_role;

-- Lecture des questions d'un besoin, selon la personne qui lit.
DROP FUNCTION IF EXISTS public.get_mission_questions(uuid);
CREATE OR REPLACE FUNCTION public.get_mission_questions(p_mission_id uuid)
RETURNS TABLE (
  id uuid,
  body text,
  answer text,
  answered_at timestamptz,
  created_at timestamptz,
  asker_first_name text,
  is_mine boolean,
  is_public boolean,
  answer_is_public boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    q.id,
    q.body,
    CASE
      WHEN q.answer IS NULL THEN NULL
      WHEN q.answer_moderation = 'ok' OR auth.uid() IN (q.asker_id, m.user_id) THEN q.answer
      ELSE NULL
    END AS answer,
    CASE
      WHEN q.answer IS NULL THEN NULL
      WHEN q.answer_moderation = 'ok' OR auth.uid() IN (q.asker_id, m.user_id) THEN q.answered_at
      ELSE NULL
    END AS answered_at,
    q.created_at,
    initcap(split_part(btrim(coalesce(p.first_name, '')), ' ', 1)) AS asker_first_name,
    (auth.uid() IS NOT NULL AND auth.uid() = q.asker_id) AS is_mine,
    (q.moderation = 'ok') AS is_public,
    (q.answer_moderation = 'ok') AS answer_is_public
  FROM public.mission_questions q
  JOIN public.small_missions m ON m.id = q.mission_id
  JOIN public.profiles p ON p.id = q.asker_id
  WHERE q.mission_id = p_mission_id
    AND q.hidden_at IS NULL
    AND m.hidden_at IS NULL
    AND m.moderation_hidden_at IS NULL
    AND coalesce(m.category, '') <> 'projet'
    AND coalesce(m.mission_type::text, '') <> 'offre'
    AND p.account_status = 'active'
    AND (q.moderation = 'ok' OR auth.uid() IN (q.asker_id, m.user_id))
  ORDER BY q.created_at ASC
  LIMIT 50;
$function$;

REVOKE ALL ON FUNCTION public.get_mission_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mission_questions(uuid) TO anon, authenticated, service_role;

-- Enregistrement d'une question, plafonds recomptés sous verrou : deux appels
-- simultanés d'une même personne passent l'un après l'autre. Réservé à la
-- fonction serveur mission-question (clé de service).
CREATE OR REPLACE FUNCTION public.insert_mission_question(
  p_mission_id uuid,
  p_asker_id uuid,
  p_body text,
  p_moderation text,
  p_per_mission integer,
  p_per_day integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mission_question:' || p_asker_id::text));
  IF (SELECT count(*) FROM public.mission_questions
       WHERE mission_id = p_mission_id AND asker_id = p_asker_id) >= p_per_mission THEN
    RAISE EXCEPTION 'limit_mission' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.mission_questions
       WHERE asker_id = p_asker_id AND created_at >= now() - interval '24 hours') >= p_per_day THEN
    RAISE EXCEPTION 'limit_day' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.mission_questions (mission_id, asker_id, body, moderation)
  VALUES (p_mission_id, p_asker_id, p_body, p_moderation)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.insert_mission_question(uuid, uuid, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_mission_question(uuid, uuid, text, text, integer, integer) TO service_role;

-- Pré-rendu : une question ou une réponse change la fiche publique du besoin.
CREATE OR REPLACE FUNCTION public.queue_mission_question_seo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_mission uuid := coalesce(NEW.mission_id, OLD.mission_id);
  v_slug text;
BEGIN
  SELECT coalesce(nullif(m.slug, ''), m.id::text) INTO v_slug
    FROM public.small_missions m WHERE m.id = v_mission;
  IF v_slug IS NOT NULL THEN
    PERFORM public.enqueue_seo_url('/petites-missions/' || v_slug);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS seo_url_outbox_mission_questions ON public.mission_questions;
CREATE TRIGGER seo_url_outbox_mission_questions
  AFTER INSERT OR UPDATE OR DELETE ON public.mission_questions
  FOR EACH ROW EXECUTE FUNCTION public.queue_mission_question_seo();

-- Emails dont le bouton ouvre une session (règle Y1, liste du lot E23).
CREATE OR REPLACE FUNCTION public.consume_email_deep_link(p_token text, p_caller uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_email text;
  c_session_window constant interval := interval '2 hours';
  c_session_templates constant text[] := ARRAY[
    'new-message', 'new-application', 'first-application-received', 'review-received',
    'mission-response-received', 'mission-question-received', 'mission-question-answered'
  ];
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{40,128}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  SELECT * INTO r FROM public.email_deep_link_tokens WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  IF r.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'consumed', 'target_path', r.target_path);
  END IF;
  IF r.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired', 'target_path', r.target_path);
  END IF;
  IF r.conversation_id IS NOT NULL THEN
    PERFORM 1 FROM public.conversations c
      WHERE c.id = r.conversation_id
        AND (c.owner_id = r.user_id OR c.sitter_id = r.user_id);
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
    END IF;
  END IF;
  IF p_caller IS NOT NULL AND p_caller <> r.user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'other_account', 'target_path', r.target_path);
  END IF;
  IF p_caller IS NOT NULL THEN
    UPDATE public.email_deep_link_tokens
       SET consumed_at = now()
     WHERE id = r.id AND consumed_at IS NULL;
    RETURN jsonb_build_object(
      'ok', true,
      'same_account', true,
      'target_path', r.target_path,
      'template_name', r.template_name,
      'message_id', r.message_id
    );
  END IF;
  IF r.template_name IS NULL
     OR NOT (r.template_name = ANY (c_session_templates))
     OR r.created_at < now() - c_session_window THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'login_required', 'target_path', r.target_path);
  END IF;
  UPDATE public.email_deep_link_tokens
     SET consumed_at = now()
   WHERE id = r.id AND consumed_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'consumed', 'target_path', r.target_path);
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = r.user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'email', v_email,
    'target_path', r.target_path,
    'template_name', r.template_name,
    'message_id', r.message_id
  );
END;
$function$;
