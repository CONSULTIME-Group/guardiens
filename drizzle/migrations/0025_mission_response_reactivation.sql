ALTER TABLE public.small_mission_responses ADD COLUMN IF NOT EXISTS reactivated_at timestamptz NULL;
COMMENT ON COLUMN public.small_mission_responses.reactivated_at IS 'Horodatage de la dernière réactivation d''une réponse retirée (repasse en pending, historique conservé).';

CREATE OR REPLACE FUNCTION public.prevent_mission_response_status_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Réactivation encadrée par reactivate_my_mission_response (withdrawn vers pending)
  IF current_setting('guardiens.response_reactivation', true) = 'on'
     AND OLD.status = 'withdrawn'::small_mission_response_status
     AND NEW.status = 'pending'::small_mission_response_status
     AND auth.uid() = OLD.responder_id THEN
    RETURN NEW;
  END IF;

  SELECT m.user_id INTO v_owner FROM public.small_missions m WHERE m.id = NEW.mission_id;

  IF v_owner = auth.uid() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.responder_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status = 'pending'::small_mission_response_status
              AND NEW.status = 'withdrawn'::small_mission_response_status) THEN
        RAISE EXCEPTION 'Le gardien ne peut que retirer sa réponse en attente';
      END IF;
    END IF;
    IF NEW.responder_id IS DISTINCT FROM OLD.responder_id
       OR NEW.mission_id IS DISTINCT FROM OLD.mission_id THEN
      RAISE EXCEPTION 'Modification interdite';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Modification interdite';
END;
$function$;

CREATE OR REPLACE FUNCTION public.small_mission_responses_guard_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF current_setting('guardiens.response_reactivation', true) = 'on'
       AND OLD.status = 'withdrawn' AND NEW.status = 'pending'
       AND auth.uid() = OLD.responder_id THEN
      RETURN NEW;
    END IF;
    SELECT m.user_id INTO v_owner FROM public.small_missions m WHERE m.id = OLD.mission_id;
    IF auth.uid() IS DISTINCT FROM v_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      IF NOT (auth.uid() = OLD.responder_id AND NEW.status = 'withdrawn' AND OLD.status = 'pending') THEN
        RAISE EXCEPTION 'Only the mission owner can change response status';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_mission_response_status_transitions()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  is_owner boolean;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF current_setting('guardiens.response_reactivation', true) = 'on'
     AND OLD.status = 'withdrawn'::small_mission_response_status
     AND NEW.status = 'pending'::small_mission_response_status
     AND auth.uid() = OLD.responder_id THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.small_missions m
    WHERE m.id = NEW.mission_id AND m.user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.responder_id THEN
    IF NEW.status IN ('withdrawn'::small_mission_response_status,
                      'declined'::small_mission_response_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Vous ne pouvez que retirer votre proposition.';
  END IF;

  RAISE EXCEPTION 'Not authorized to change mission response status.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.reactivate_my_mission_response(p_mission_id uuid, p_message text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_status small_mission_status;
  v_owner uuid;
  v_id uuid;
  v_msg text := btrim(coalesce(p_message, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF length(v_msg) < 10 OR length(v_msg) > 500 THEN
    RAISE EXCEPTION 'invalid_message';
  END IF;
  SELECT m.status, m.user_id INTO v_status, v_owner FROM public.small_missions m WHERE m.id = p_mission_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'mission_missing'; END IF;
  IF v_owner = v_uid THEN RAISE EXCEPTION 'own_mission'; END IF;
  IF v_status <> 'open' THEN RAISE EXCEPTION 'mission_closed'; END IF;

  PERFORM set_config('guardiens.response_reactivation', 'on', true);
  UPDATE public.small_mission_responses
     SET status = 'pending', message = v_msg, reactivated_at = now()
   WHERE mission_id = p_mission_id AND responder_id = v_uid AND status = 'withdrawn'
  RETURNING id INTO v_id;
  PERFORM set_config('guardiens.response_reactivation', 'off', true);
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reactivate_my_mission_response(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_my_mission_response(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.clear_my_withdrawn_mission_response(uuid);