
-- ─────────────────────────────────────────────────────────────
-- 1. Éligibilité auteur (mission + réponse)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_mutual_aid_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_completion int;
  v_status text;
BEGIN
  -- Choix de la colonne selon la table
  IF TG_TABLE_NAME = 'small_missions' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'small_mission_responses' THEN
    v_user_id := NEW.responder_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bypass admin
  IF public.has_role(v_user_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(profile_completion, 0), COALESCE(account_status, 'active')
    INTO v_completion, v_status
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'account_not_active'
      USING ERRCODE = 'P0001', HINT = 'account_not_active';
  END IF;

  IF v_completion < 60 THEN
    RAISE EXCEPTION 'profile_incomplete: %', v_completion
      USING ERRCODE = 'P0001', HINT = 'profile_incomplete';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_mission_eligibility ON public.small_missions;
CREATE TRIGGER trg_enforce_mission_eligibility
BEFORE INSERT ON public.small_missions
FOR EACH ROW EXECUTE FUNCTION public.enforce_mutual_aid_eligibility();

-- ─────────────────────────────────────────────────────────────
-- 2. Plafond de 5 réponses pending par mission + éligibilité
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_mission_response_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending int;
BEGIN
  SELECT count(*) INTO v_pending
    FROM public.small_mission_responses
   WHERE mission_id = NEW.mission_id
     AND status = 'pending';

  IF v_pending >= 5 THEN
    RAISE EXCEPTION 'mission_response_cap_reached'
      USING ERRCODE = 'P0001', HINT = 'mission_response_cap_reached';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_response_eligibility ON public.small_mission_responses;
CREATE TRIGGER trg_enforce_response_eligibility
BEFORE INSERT ON public.small_mission_responses
FOR EACH ROW EXECUTE FUNCTION public.enforce_mutual_aid_eligibility();

DROP TRIGGER IF EXISTS trg_enforce_response_cap ON public.small_mission_responses;
CREATE TRIGGER trg_enforce_response_cap
BEFORE INSERT ON public.small_mission_responses
FOR EACH ROW EXECUTE FUNCTION public.enforce_mission_response_cap();

-- ─────────────────────────────────────────────────────────────
-- 3. RPC atomique accept_mission_response
--    - vérifie ownership + statut réponse
--    - passe la réponse en accepted
--    - passe la mission en in_progress si open
--    - décline (option) les autres pending
--    - crée/récupère la conversation
--    - insère un message système d'acceptation
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_mission_response(
  p_response_id uuid,
  p_decline_others boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- 1) accept
  UPDATE public.small_mission_responses
     SET status = 'accepted'
   WHERE id = p_response_id;

  -- 2) mission → in_progress si nécessaire
  IF v_mission_status = 'open' THEN
    UPDATE public.small_missions
       SET status = 'in_progress', updated_at = now()
     WHERE id = v_mission_id;
  END IF;

  -- 3) cascade decline (optionnel)
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

  -- 4) conversation mission_help (owner ↔ responder)
  v_conv_id := public.get_or_create_conversation(
    p_other_user_id := v_responder_id,
    p_context_type  := 'mission_help'::conversation_context,
    p_sit_id        := NULL,
    p_small_mission_id := v_mission_id
  );

  -- 5) message système d'acceptation (idempotent : évite le doublon)
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
$$;

GRANT EXECUTE ON FUNCTION public.accept_mission_response(uuid, boolean) TO authenticated;
