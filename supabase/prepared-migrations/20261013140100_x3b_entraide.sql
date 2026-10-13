-- Lot X3b (13/10/2026) : parcours entraide, défauts P1 de l'audit C du 13/10.
-- Fonctions reprises de la production (pg_get_functiondef du 13/10/2026),
-- seules les lignes marquées « Lot X3b » changent.
--
-- 1. C-03 : à la clôture d'un besoin (manuelle, automatique, annulation, fin),
--    les propositions encore en attente passent à « declined » et leurs auteurs
--    reçoivent une notification in-app, une seule fois, sans email. 6 des 8
--    propositions « pending » portaient sur un besoin fermé, sans aucun signal
--    à l'aidant. Le trigger couvre tous les chemins (auteur, cron
--    auto-close-small-missions en service_role, mark_mission_done, équipe).
-- 2. C-05 : une proposition d'aide (et sa réactivation) part aussi en push
--    vers l'auteur, par la file push_delivery_jobs (type « mission_response »,
--    réglage « Candidatures et propositions d'aide » : opt_in_applications).
-- 3. C-12 et C-22 : notify_new_mission_response réagit aussi à une réponse
--    réactivée (withdrawn vers pending, reactivate_my_mission_response) et
--    pointe vers /projets/{slug} pour un projet, /petites-missions/{id} sinon.
-- 4. C-08 : « Votre demande reste visible » au plus une fois par besoin et par
--    semaine (114 notifications pour 5 besoins au 13/10/2026, jusqu'à 53 pour
--    un même auteur en 4 jours). Nettoyage de l'existant préparé, commenté.
-- 5. C-09 : un besoin sans coordonnées est refusé à l'insertion (hors
--    projets), même règle que resolveMissionCoords (lot E10). Traitement du
--    besoin de Mascouche préparé, commenté et désactivé : à arbitrer.
-- 6. C-10 : l'écusson « coup de main en or » suit le geste de l'auteur du
--    besoin (« Marquer comme terminé » ou « oui » à la question de rencontre),
--    jamais celui de l'aidant au nom de l'auteur. 0 écusson attribué à ce jour.

-- 1. C-03 ---------------------------------------------------------------
-- Drapeau transactionnel posé par le seul trigger de clôture : les gardes
-- de statut laissent passer pending vers declined pendant la clôture, même
-- quand l'appelant est le cron (auth.uid() vide).
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

  -- Lot X3b : clôture du besoin (close_pending_responses_on_mission_close).
  IF current_setting('guardiens.mission_closure', true) = 'on'
     AND OLD.status = 'pending'::small_mission_response_status
     AND NEW.status = 'declined'::small_mission_response_status THEN
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
    -- Lot X3b : clôture du besoin (pending vers declined).
    IF current_setting('guardiens.mission_closure', true) = 'on'
       AND OLD.status = 'pending' AND NEW.status = 'declined' THEN
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

-- Adresse d'une publication d'entraide, même règle que missionLinkFor
-- (supabase/functions/_shared/mission-link.ts) et projetPath.
CREATE OR REPLACE FUNCTION public.mission_link_for(p_id uuid, p_slug text, p_category text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_category = 'projet' THEN '/projets/' || coalesce(nullif(btrim(p_slug), ''), p_id::text)
    ELSE '/petites-missions/' || p_id::text
  END;
$function$;

CREATE OR REPLACE FUNCTION public.close_pending_responses_on_mission_close()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_link text := public.mission_link_for(NEW.id, NEW.slug, NEW.category::text);
  v_title text := coalesce(nullif(btrim(NEW.title), ''), 'ce coup de main');
  v_type text;
  v_head text;
  v_body text;
BEGIN
  IF NEW.status = 'completed'::small_mission_status THEN
    v_type := 'mission_declined';
    v_head := 'Ce coup de main a trouvé son aide';
    v_body := '« ' || v_title || ' » est terminé. Merci pour votre proposition, d''autres besoins près de chez vous attendent un coup de main.';
  ELSE
    v_type := 'mission_cancelled';
    v_head := 'Ce besoin est clos';
    v_body := '« ' || v_title || ' » est clos. Merci pour votre proposition, d''autres besoins près de chez vous attendent un coup de main.';
  END IF;

  BEGIN
    PERFORM set_config('guardiens.mission_closure', 'on', true);
    FOR r IN
      UPDATE public.small_mission_responses
         SET status = 'declined'::small_mission_response_status
       WHERE mission_id = NEW.id
         AND status = 'pending'::small_mission_response_status
      RETURNING id, responder_id
    LOOP
      -- Une seule notification par personne et par besoin, quel que soit le
      -- chemin (le bouton « Clôturer » de l'auteur prévient déjà par
      -- notify-mission-event avant de clore).
      IF r.responder_id IS NOT NULL AND r.responder_id <> NEW.user_id AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = r.responder_id
          AND n.link = v_link
          AND n.type IN ('mission_cancelled', 'mission_declined')
      ) THEN
        INSERT INTO public.notifications (user_id, type, title, body, link, actor_name)
        VALUES (r.responder_id, v_type, v_head, v_body, v_link, 'Guardiens');
      END IF;
    END LOOP;
    PERFORM set_config('guardiens.mission_closure', 'off', true);
  EXCEPTION WHEN OTHERS THEN
    -- Une clôture ne doit jamais échouer à cause des propositions.
    PERFORM set_config('guardiens.mission_closure', 'off', true);
    RAISE WARNING 'close_pending_responses_on_mission_close mission=% err=%', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_close_pending_responses_on_mission_close ON public.small_missions;
CREATE TRIGGER trg_close_pending_responses_on_mission_close
  AFTER UPDATE OF status ON public.small_missions
  FOR EACH ROW
  WHEN (OLD.status IN ('open'::small_mission_status, 'in_progress'::small_mission_status)
        AND NEW.status IN ('cancelled'::small_mission_status, 'completed'::small_mission_status))
  EXECUTE FUNCTION public.close_pending_responses_on_mission_close();

-- Reprise de l'existant (6 propositions « pending » sur 5 besoins fermés au
-- 13/10/2026), à décider par le fondateur : elle préviendrait des personnes
-- dont le besoin est clos depuis plusieurs semaines. Désactivée.
-- BEGIN;
--   SELECT set_config('guardiens.mission_closure', 'on', true);
--   UPDATE public.small_mission_responses r
--      SET status = 'declined'::small_mission_response_status
--     FROM public.small_missions m
--    WHERE m.id = r.mission_id
--      AND r.status = 'pending'::small_mission_response_status
--      AND m.status IN ('cancelled'::small_mission_status, 'completed'::small_mission_status);
--   SELECT set_config('guardiens.mission_closure', 'off', true);
-- COMMIT;

-- 2. C-05 ---------------------------------------------------------------
ALTER TABLE public.push_delivery_jobs DROP CONSTRAINT IF EXISTS push_delivery_jobs_event_kind_check;
ALTER TABLE public.push_delivery_jobs ADD CONSTRAINT push_delivery_jobs_event_kind_check
  CHECK (event_kind = ANY (ARRAY['message'::text, 'application'::text, 'mission_response'::text]));

CREATE OR REPLACE FUNCTION public.push_job_eligible(p_job_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.push_delivery_jobs j
    JOIN public.push_subscriptions s ON s.id = j.subscription_id AND s.user_id = j.user_id
    WHERE j.id = p_job_id AND s.enabled AND j.expires_at > now()
    AND (j.status='pending' OR (j.status='claimed' AND j.claim_expires_at > now()))
    AND (
      (j.event_kind = 'message' AND s.opt_in_messages AND EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
        WHERE m.id = j.source_id AND m.read_at IS NULL
          AND m.is_system IS FALSE AND m.moderation_hidden_at IS NULL
          AND m.sender_id IN (c.owner_id, c.sitter_id)
          AND j.user_id IN (c.owner_id, c.sitter_id) AND m.sender_id <> j.user_id
          AND NOT EXISTS (SELECT 1 FROM public.blocked_users b
            WHERE (b.blocker_id=m.sender_id AND b.blocked_id=j.user_id)
               OR (b.blocker_id=j.user_id AND b.blocked_id=m.sender_id))
      ))
      OR (j.event_kind = 'application' AND s.opt_in_applications AND EXISTS (
        SELECT 1 FROM public.applications a JOIN public.sits si ON si.id=a.sit_id
        WHERE a.id=j.source_id AND a.status='pending'::application_status
          AND a.viewed_at IS NULL AND si.user_id=j.user_id AND a.sitter_id<>j.user_id
          AND NOT EXISTS (SELECT 1 FROM public.blocked_users b
            WHERE (b.blocker_id=a.sitter_id AND b.blocked_id=j.user_id)
               OR (b.blocker_id=j.user_id AND b.blocked_id=a.sitter_id))
      ))
      -- Lot X3b : proposition d'aide encore en attente sur un besoin ouvert de
      -- la personne prévenue.
      OR (j.event_kind = 'mission_response' AND s.opt_in_applications AND EXISTS (
        SELECT 1 FROM public.small_mission_responses r JOIN public.small_missions sm ON sm.id=r.mission_id
        WHERE r.id=j.source_id AND r.status='pending'::small_mission_response_status
          AND sm.status='open'::small_mission_status
          AND sm.user_id=j.user_id AND r.responder_id<>j.user_id
          AND NOT EXISTS (SELECT 1 FROM public.blocked_users b
            WHERE (b.blocker_id=r.responder_id AND b.blocked_id=j.user_id)
               OR (b.blocker_id=j.user_id AND b.blocked_id=r.responder_id))
      ))
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.push_enqueue_on_mission_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recipient uuid;
BEGIN
  BEGIN
    IF NEW.status IS DISTINCT FROM 'pending'::small_mission_response_status THEN
      RETURN NEW;
    END IF;
    -- Mise à jour : seule une réactivation (withdrawn vers pending) compte.
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'withdrawn'::small_mission_response_status THEN
      RETURN NEW;
    END IF;

    SELECT m.user_id INTO v_recipient
    FROM public.small_missions m
    WHERE m.id = NEW.mission_id AND m.status = 'open'::small_mission_status;

    IF v_recipient IS NULL OR v_recipient = NEW.responder_id THEN
      RETURN NEW;
    END IF;

    -- Une réactivation reprend la tâche déjà terminée de la même réponse
    -- (clé unique abonnement, type, réponse), jamais une tâche en cours.
    INSERT INTO public.push_delivery_jobs AS j (subscription_id, user_id, event_kind, source_id, context_id)
    SELECT s.id, v_recipient, 'mission_response', NEW.id, NEW.mission_id
    FROM public.push_subscriptions s
    WHERE s.user_id = v_recipient AND s.enabled AND s.opt_in_applications
    ON CONFLICT (subscription_id, event_kind, source_id) DO UPDATE
      SET status = 'pending', attempts = 0, available_at = now(),
          claimed_at = NULL, claim_expires_at = NULL,
          expires_at = now() + interval '1 hour', last_error_code = NULL,
          created_at = now(), updated_at = now()
      WHERE j.status IN ('accepted', 'failed', 'skipped');

  EXCEPTION WHEN OTHERS THEN
    -- Une proposition ne doit jamais échouer à cause du push.
    RAISE WARNING 'push_enqueue_on_mission_response error %', SQLSTATE;
  END;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_push_enqueue_on_mission_response ON public.small_mission_responses;
CREATE TRIGGER trg_push_enqueue_on_mission_response
  AFTER INSERT OR UPDATE OF status ON public.small_mission_responses
  FOR EACH ROW EXECUTE FUNCTION public.push_enqueue_on_mission_response();

-- 3. C-12 et C-22 -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_new_mission_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mission_title text;
  v_mission_owner uuid;
  v_mission_slug text;
  v_mission_category text;
  v_link text;
  v_reactivated boolean := false;
  v_idem text;
  v_responder_name text;
  v_responder_avatar text;
  v_owner_email text;
  v_service_key text;
  v_preview text;
  v_err text;
BEGIN
  -- Lot X3b (C-12) : une réponse réactivée (withdrawn vers pending) prévient
  -- l'auteur comme une nouvelle réponse ; toute autre mise à jour est ignorée.
  IF TG_OP = 'UPDATE' THEN
    IF NOT (OLD.status = 'withdrawn'::small_mission_response_status
            AND NEW.status = 'pending'::small_mission_response_status) THEN
      RETURN NEW;
    END IF;
    v_reactivated := true;
  END IF;

  SELECT m.title, m.user_id, m.slug, m.category::text
    INTO v_mission_title, v_mission_owner, v_mission_slug, v_mission_category
  FROM public.small_missions m WHERE m.id = NEW.mission_id;

  IF v_mission_owner IS NULL OR v_mission_owner = NEW.responder_id THEN
    RETURN NEW;
  END IF;

  -- Lot X3b (C-22) : un projet a sa page /projets/{slug}, où son porteur lit
  -- les candidatures.
  v_link := public.mission_link_for(NEW.mission_id, v_mission_slug, v_mission_category);

  SELECT p.first_name, p.avatar_url INTO v_responder_name, v_responder_avatar
  FROM public.profiles p WHERE p.id = NEW.responder_id;

  v_preview := left(coalesce(NEW.message, ''), 220);

  -- A) Notification in-app (isolée)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      v_mission_owner,
      'mission_response_received',
      CASE WHEN v_mission_category = 'projet' THEN 'Nouvelle candidature à votre projet'
           ELSE 'Nouvelle réponse à votre coup de main' END,
      coalesce(v_responder_name, 'Un membre')
        || CASE WHEN v_reactivated THEN ' vous propose à nouveau son aide pour « ' ELSE ' vous propose son aide pour « ' END
        || coalesce(v_mission_title, 'votre annonce') || ' ».',
      v_link,
      v_responder_name,
      v_responder_avatar
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'notify_new_mission_response[inapp] resp=% err=%', NEW.id, v_err;
    BEGIN
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'mission_response', NEW.id,
        jsonb_build_object('phase','in_app','sqlerrm', v_err, 'owner_id', v_mission_owner));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- B) Email transactionnel (isolé)
  BEGIN
    SELECT p.email INTO v_owner_email FROM public.profiles p WHERE p.id = v_mission_owner;
    IF v_owner_email IS NULL OR v_owner_email = '' THEN
      RETURN NEW;
    END IF;

    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_role_key' LIMIT 1;
    IF v_service_key IS NULL THEN
      RETURN NEW;
    END IF;

    -- Lot X3b : une réactivation a sa propre clé, la première réponse garde la sienne.
    v_idem := 'mission-response-received-' || NEW.id::text
      || CASE WHEN v_reactivated
              THEN '-' || floor(extract(epoch FROM coalesce(NEW.reactivated_at, now())))::bigint::text
              ELSE '' END;

    PERFORM net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-transactional-email',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'templateName', 'mission-response-received',
        'recipientEmail', v_owner_email,
        'idempotencyKey', v_idem,
        'templateData', jsonb_build_object(
          'responderFirstName', coalesce(v_responder_name, 'Un membre'),
          'missionTitle', coalesce(v_mission_title, 'votre annonce'),
          'missionId', NEW.mission_id,
          'messagePreview', v_preview
        ),
        'metadata', jsonb_build_object('mission_id', NEW.mission_id, 'response_id', NEW.id, 'reactivated', v_reactivated)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'notify_new_mission_response[email] resp=% err=%', NEW.id, v_err;
  END;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_new_mission_response ON public.small_mission_responses;
CREATE TRIGGER trg_notify_new_mission_response
  AFTER INSERT OR UPDATE OF status ON public.small_mission_responses
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_mission_response();

-- 4. C-08 ---------------------------------------------------------------
-- Filet de base : notify-mission-wave vérifie déjà la semaine écoulée avant
-- d'écrire (waveEmptyNotificationDue) ; ce trigger écarte toute copie
-- arrivée par un autre passage, sans erreur pour l'appelant.
CREATE OR REPLACE FUNCTION public.skip_repeated_wave_empty_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type = 'mission_wave_empty' AND EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = NEW.user_id
      AND n.type = 'mission_wave_empty'
      AND n.link IS NOT DISTINCT FROM NEW.link
      AND n.created_at > now() - interval '7 days'
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_skip_repeated_wave_empty_notification ON public.notifications;
CREATE TRIGGER trg_skip_repeated_wave_empty_notification
  BEFORE INSERT ON public.notifications
  FOR EACH ROW WHEN (NEW.type = 'mission_wave_empty')
  EXECUTE FUNCTION public.skip_repeated_wave_empty_notification();

-- Nettoyage de l'existant (114 lignes pour 5 couples auteur et besoin au
-- 13/10/2026) : garde la plus ancienne notification de chaque couple, retire
-- les copies. Préparé, désactivé, à lancer après accord.
-- DELETE FROM public.notifications n
--  USING (
--    SELECT id, row_number() OVER (PARTITION BY user_id, link ORDER BY created_at, id) AS rang
--      FROM public.notifications
--     WHERE type = 'mission_wave_empty'
--  ) d
--  WHERE n.id = d.id AND d.rang > 1;

-- 5. C-09 ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_small_mission_place()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Un besoin sans lieu situé ne part vers personne (lot E10) ; un projet
  -- participatif garde sa propre règle de lieu.
  IF NEW.category::text IS DISTINCT FROM 'projet'
     AND (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN
    RAISE EXCEPTION 'Saisissez à nouveau le code postal de votre commune, puis choisissez-la si une liste s''affiche : votre besoin part alors vers les personnes disponibles les plus proches.'
      USING HINT = 'mission_place_missing', ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_small_mission_place ON public.small_missions;
CREATE TRIGGER trg_enforce_small_mission_place
  BEFORE INSERT ON public.small_missions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_small_mission_place();

-- Besoin de Mascouche (Québec, c54f53ff-8683-49be-b8af-b2236cd43908, publié
-- le 11/10/2026, code postal « 704 », sans coordonnées, 0 proposition, 20
-- notifications « reste visible ») : à arbitrer par le fondateur. Piste
-- préparée, désactivée : clore le besoin et proposer à l'auteur une annonce
-- de garde, que le lot Q1 diffuse aux gardiens à l'échelle nationale.
-- BEGIN;
--   UPDATE public.small_missions
--      SET status = 'cancelled'::small_mission_status, closed_at = now(), close_reason = 'place_missing'
--    WHERE id = 'c54f53ff-8683-49be-b8af-b2236cd43908' AND status = 'open'::small_mission_status;
--   INSERT INTO public.notifications (user_id, type, title, body, link, actor_name)
--   SELECT m.user_id, 'mission_place_missing', 'Votre demande, en annonce de garde',
--          'Pour une garde au Québec, une annonce de garde part vers les gardiens de toute la France. Vos dates et votre texte sont repris en un clic.',
--          '/sits/create', 'Guardiens'
--     FROM public.small_missions m WHERE m.id = 'c54f53ff-8683-49be-b8af-b2236cd43908';
-- COMMIT;

-- 6. C-10 ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_mission_done(p_mission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  m record;
  v_helper_id uuid;
  v_badge_rows int := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized'); END IF;

  SELECT s.id, s.user_id, s.status, s.close_reason INTO m
  FROM public.small_missions s WHERE s.id = p_mission_id FOR UPDATE;
  IF m.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT resp.responder_id INTO v_helper_id
  FROM public.small_mission_responses resp
  WHERE resp.mission_id = p_mission_id AND resp.status = 'accepted'
  ORDER BY resp.accepted_at NULLS LAST, resp.created_at LIMIT 1;

  IF v_uid <> m.user_id AND v_uid IS DISTINCT FROM v_helper_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  IF m.status = 'cancelled' THEN RETURN jsonb_build_object('ok', false, 'reason', 'cancelled'); END IF;
  IF m.status = 'completed' AND (m.close_reason IS DISTINCT FROM 'auto_completed_after_date' OR v_helper_id IS NULL) THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'counted', COALESCE(m.close_reason = 'meetup_confirmed', false));
  END IF;

  UPDATE public.small_missions
     SET status = 'completed',
         closed_at = COALESCE(closed_at, now()),
         close_reason = CASE WHEN v_helper_id IS NOT NULL THEN 'meetup_confirmed' ELSE 'completed_by_author' END,
         updated_at = now()
   WHERE id = p_mission_id;

  -- Lot X3b (C-10) : l'écusson vient de l'auteur, quand c'est lui qui termine.
  IF v_helper_id IS NOT NULL AND v_uid = m.user_id THEN
    INSERT INTO public.badge_attributions (user_id, badge_id, giver_id, mission_id, is_manual)
    VALUES (v_helper_id, 'coup_de_main_or', m.user_id, m.id, false)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_badge_rows = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('ok', true, 'already', false, 'counted', v_helper_id IS NOT NULL,
    'badge_awarded', v_badge_rows > 0, 'helper_id', v_helper_id, 'owner_id', m.user_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_mission_done(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_mission_done(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirm_mission_meetup(p_token text, p_word text DEFAULT NULL::text, p_public_ok boolean DEFAULT true)
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

  SELECT s.id, s.user_id, s.title, s.status, s.close_reason, s.date_needed, s.end_date INTO m
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
    -- Lot X3b (C-10) : l'écusson vient du « oui » de l'auteur du besoin
    -- (jeton de l'auteur : helper_id du jeton = auteur), jamais du « oui » de
    -- l'aidant au nom de l'auteur.
    IF v_helper_id IS NOT NULL AND r.helper_id = m.user_id THEN
      INSERT INTO public.badge_attributions (user_id, badge_id, giver_id, mission_id, is_manual)
      VALUES (v_helper_id, 'coup_de_main_or', m.user_id, m.id, false)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_badge_rows = ROW_COUNT;
    END IF;

    UPDATE public.small_missions
       SET status = 'completed', closed_at = COALESCE(closed_at, now()), close_reason = 'meetup_confirmed', updated_at = now()
     WHERE id = m.id
       AND status <> 'cancelled'
       AND (status <> 'completed' OR close_reason IS NOT DISTINCT FROM 'auto_completed_after_date');
  ELSIF m.status = 'cancelled' OR (m.status = 'completed' AND m.close_reason IS NOT DISTINCT FROM 'meetup_confirmed') THEN
    NULL;
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
