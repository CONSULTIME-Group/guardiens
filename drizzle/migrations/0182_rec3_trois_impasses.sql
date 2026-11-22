-- Lot REC3 (22/11/2026, recette complete du 22/11, maquette Claude Design
-- « Guardiens, trois impasses : avant / apres », « ok go tt » de Jeremie).
-- Repere : rec3_trois_impasses.
--
-- 1. reapply_to_sit : un gardien dont la candidature est annulee (retrait, ou
--    depublication puis republication de l'annonce) candidate de nouveau.
--    Constat du 22/11/2026 : insertion refusee par la contrainte d'unicite,
--    reouverture refusee au gardien, 13 gardiens bloques sur 8 annonces
--    ouvertes. La candidature annulee est remplacee par une nouvelle : toutes
--    les regles d'une candidature (annonce ouverte, plafond, profil a 40 %,
--    compte actif) et ses notifications passent par les declencheurs
--    d'insertion existants. Une candidature declinee reste a la main du
--    proprietaire (reopen_application).
-- 2. withdraw_my_accepted_response : un membre retenu pour un coup de main
--    libere sa place. Constat du 22/11/2026 : aucun bouton, et la base levait
--    « Le gardien ne peut que retirer sa reponse en attente ». La reponse
--    passe a withdrawn, le besoin se rouvre s'il n'a plus personne de retenu,
--    l'auteur est prevenu.
--    Les deux garde-fous de statut (corps repris de pg_proc du 22/11/2026)
--    admettent ce seul passage, sous le drapeau guardiens.accepted_withdrawal
--    pose par la fonction.
-- Aucune donnee modifiee. Rejouable.

CREATE OR REPLACE FUNCTION public.reapply_to_sit(p_sit_id uuid, p_message text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- rec3_trois_impasses
DECLARE
  v_uid uuid := auth.uid();
  v_old uuid;
  v_new uuid;
  v_msg text := btrim(coalesce(p_message, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF length(v_msg) = 0 THEN
    RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023';
  END IF;
  SELECT a.id INTO v_old
    FROM public.applications a
   WHERE a.sit_id = p_sit_id
     AND a.sitter_id = v_uid
     AND a.status = 'cancelled'::application_status
   FOR UPDATE;
  IF v_old IS NULL THEN
    RAISE EXCEPTION 'no_cancelled_application' USING ERRCODE = 'P0002';
  END IF;
  DELETE FROM public.applications WHERE id = v_old;
  INSERT INTO public.applications (sit_id, sitter_id, message, status)
  VALUES (p_sit_id, v_uid, v_msg, 'pending'::application_status)
  RETURNING id INTO v_new;
  RETURN v_new;
END;
$function$;

REVOKE ALL ON FUNCTION public.reapply_to_sit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reapply_to_sit(uuid, text) TO authenticated;

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
    -- Lot X3b : clôture du besoin (pending vers declined).
    IF current_setting('guardiens.mission_closure', true) = 'on'
       AND OLD.status = 'pending' AND NEW.status = 'declined' THEN
      RETURN NEW;
    END IF;
    -- rec3_trois_impasses : le membre retenu libère sa place (accepted vers withdrawn).
    IF current_setting('guardiens.accepted_withdrawal', true) = 'on'
       AND OLD.status = 'accepted' AND NEW.status = 'withdrawn'
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

  -- Lot X3b : clôture du besoin, statut seul (pending vers declined).
  IF current_setting('guardiens.mission_closure', true) = 'on'
     AND OLD.status = 'pending'::small_mission_response_status
     AND NEW.status = 'declined'::small_mission_response_status
     AND NEW.responder_id IS NOT DISTINCT FROM OLD.responder_id
     AND NEW.mission_id IS NOT DISTINCT FROM OLD.mission_id THEN
    RETURN NEW;
  END IF;

  -- rec3_trois_impasses : le membre retenu libère sa place, statut seul
  -- (accepted vers withdrawn), par withdraw_my_accepted_response.
  IF current_setting('guardiens.accepted_withdrawal', true) = 'on'
     AND OLD.status = 'accepted'::small_mission_response_status
     AND NEW.status = 'withdrawn'::small_mission_response_status
     AND auth.uid() = OLD.responder_id
     AND NEW.responder_id IS NOT DISTINCT FROM OLD.responder_id
     AND NEW.mission_id IS NOT DISTINCT FROM OLD.mission_id THEN
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

CREATE OR REPLACE FUNCTION public.withdraw_my_accepted_response(p_mission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- rec3_trois_impasses
DECLARE
  v_uid uuid := auth.uid();
  v_response uuid;
  v_owner uuid;
  v_status small_mission_status;
  v_title text;
  v_name text;
  v_reopened boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT m.user_id, m.status, m.title INTO v_owner, v_status, v_title
    FROM public.small_missions m WHERE m.id = p_mission_id FOR UPDATE;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'mission_missing' USING ERRCODE = 'P0002';
  END IF;
  IF v_status NOT IN ('open'::small_mission_status, 'in_progress'::small_mission_status) THEN
    RAISE EXCEPTION 'mission_closed' USING ERRCODE = '22023';
  END IF;
  SELECT r.id INTO v_response
    FROM public.small_mission_responses r
   WHERE r.mission_id = p_mission_id AND r.responder_id = v_uid
     AND r.status = 'accepted'::small_mission_response_status
   FOR UPDATE;
  IF v_response IS NULL THEN
    RAISE EXCEPTION 'no_accepted_response' USING ERRCODE = 'P0002';
  END IF;

  PERFORM set_config('guardiens.accepted_withdrawal', 'on', true);
  UPDATE public.small_mission_responses
     SET status = 'withdrawn'::small_mission_response_status
   WHERE id = v_response;
  PERFORM set_config('guardiens.accepted_withdrawal', 'off', true);

  IF v_status = 'in_progress'::small_mission_status
     AND NOT EXISTS (SELECT 1 FROM public.small_mission_responses r
                      WHERE r.mission_id = p_mission_id
                        AND r.status = 'accepted'::small_mission_response_status) THEN
    BEGIN
      UPDATE public.small_missions
         SET status = 'open'::small_mission_status, updated_at = now()
       WHERE id = p_mission_id;
      v_reopened := true;
    EXCEPTION WHEN OTHERS THEN
      v_reopened := false; -- le désistement tient, l'auteur est prévenu
    END;
  END IF;

  BEGIN
    SELECT NULLIF(btrim(first_name), '') INTO v_name FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name)
    VALUES (
      v_owner, 'mission_response_withdrawn', 'Une place se libère',
      coalesce(v_name, 'Un membre') || ' a libéré sa place pour « ' || coalesce(v_title, 'votre besoin') || ' ».'
        || CASE WHEN v_reopened THEN ' Votre besoin est de nouveau ouvert.' ELSE '' END,
      '/petites-missions/' || p_mission_id, v_name);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- la cloche ne bloque jamais un désistement
  END;

  RETURN jsonb_build_object('ok', true, 'response_id', v_response, 'reopened', v_reopened);
END;
$function$;

REVOKE ALL ON FUNCTION public.withdraw_my_accepted_response(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_my_accepted_response(uuid) TO authenticated;
