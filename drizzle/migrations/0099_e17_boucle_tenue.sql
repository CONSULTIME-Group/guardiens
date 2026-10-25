-- Lot E17 « La boucle tenue » (arène entraide du 25/10/2026, R1) : le
-- demandeur voit qui a répondu et choisit en un geste.
--
-- 1. small_mission_responses.decline_reason : 'mission_closed' quand la
--    réponse passe en declined par la clôture du besoin
--    (close_pending_responses_on_mission_close). NULL garde le sens
--    historique : refus de l'auteur ou autre personne choisie.
--    Rétrocompatible : colonne facultative, aucune lecture existante changée.
--    Reprise de l'existant : les réponses declined d'un besoin clos
--    (cancelled ou completed) sans aucune réponse acceptée sont des clôtures
--    (registre du 25/10, n° 4 : 6 réponses sur 7, aucun refus d'auteur).
-- 2. mission_pending_responders : répondants en attente d'un besoin (prénom,
--    distance, « ce que je propose volontiers », Identité vérifiée, date
--    proposée) avec leur jeton de choix (emit_mission_choose_token, inchangé).
-- 3. notify_new_mission_response : l'email mission-response-received porte
--    cette liste, donc un bouton « Choisir {prénom} » par répondant.
-- 4. consume_mission_choose_token : pour un besoin (hors projet), le choix
--    écarte les autres réponses en attente (comme la page du besoin), et la
--    conversation s'ouvre avec le premier message de la page du besoin quand
--    elle n'en contient encore aucun.
-- 5. handle_new_user : l'intention d'inscription (métadonnée arrival_intent :
--    owner, sitter, entraide) est écrite sur le profil dès la création du
--    compte. Jusqu'ici seul l'écran C4 du parcours arrival_v2 (drapeau
--    éteint) l'écrivait : 0 compte sur 244 du mois.
-- 6. La relance mission-choose-helper est fondue dans la relance à 24 h
--    (send-mission-nudges, mission-response-waiting) : sa tâche planifiée
--    est retirée, choose_prompt_sent_at reste le marqueur unique par réponse.
-- Fonctions reprises de la production (pg_get_functiondef du 25/10/2026),
-- seules les lignes marquées « Lot E17 » changent. Rejouable.

-- 1. Clôture distinguée d'un refus --------------------------------------
ALTER TABLE public.small_mission_responses ADD COLUMN IF NOT EXISTS decline_reason text NULL;
ALTER TABLE public.small_mission_responses DROP CONSTRAINT IF EXISTS small_mission_responses_decline_reason_check;
ALTER TABLE public.small_mission_responses ADD CONSTRAINT small_mission_responses_decline_reason_check
  CHECK (decline_reason IS NULL OR decline_reason IN ('mission_closed'));
COMMENT ON COLUMN public.small_mission_responses.decline_reason IS
  'Lot E17 : mission_closed quand la réponse est passée en declined à la clôture du besoin. NULL : refus de l''auteur ou autre personne choisie.';

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
  -- Relecture R8 (13/10/2026) : « trouvé son aide » seulement après une
  -- rencontre confirmée. Une fin sans personne retenue (completed_by_author,
  -- auto_completed_after_date, meetup_not_happened) se lit « est clos ». Le
  -- type suit toujours le statut.
  IF NEW.status = 'completed'::small_mission_status THEN
    v_type := 'mission_declined';
  ELSE
    v_type := 'mission_cancelled';
  END IF;
  IF NEW.status = 'completed'::small_mission_status
     AND NEW.close_reason = 'meetup_confirmed' THEN
    v_head := 'Ce coup de main a trouvé son aide';
    v_body := '« ' || v_title || ' » est terminé. Merci pour votre proposition, d''autres besoins près de chez vous attendent un coup de main.';
  ELSE
    v_head := 'Ce besoin est clos';
    v_body := '« ' || v_title || ' » est clos. Merci pour votre proposition, d''autres besoins près de chez vous attendent un coup de main.';
  END IF;

  BEGIN
    PERFORM set_config('guardiens.mission_closure', 'on', true);
    FOR r IN
      UPDATE public.small_mission_responses
         SET status = 'declined'::small_mission_response_status,
             -- Lot E17 : une clôture se distingue d'un refus.
             decline_reason = 'mission_closed'
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

-- Reprise de l'existant. Le garde-fou prevent_mission_response_status_tampering
-- laisse le répondant modifier sa ligne hors statut : l'identité du répondant
-- est posée le temps de chaque mise à jour (même procédé que
-- mark_mission_choose_prompt_sent). Le statut reste inchangé.
DO $reprise$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT resp.id, resp.responder_id
      FROM public.small_mission_responses resp
      JOIN public.small_missions m ON m.id = resp.mission_id
     WHERE resp.status = 'declined'::small_mission_response_status
       AND resp.decline_reason IS NULL
       AND m.status IN ('cancelled'::small_mission_status, 'completed'::small_mission_status)
       AND NOT EXISTS (
         SELECT 1 FROM public.small_mission_responses a
          WHERE a.mission_id = resp.mission_id
            AND a.status = 'accepted'::small_mission_response_status
       )
  LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', r.responder_id, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', r.responder_id::text, true);
    UPDATE public.small_mission_responses SET decline_reason = 'mission_closed' WHERE id = r.id;
  END LOOP;
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
END
$reprise$;

-- 2. Répondants en attente, avec leur jeton de choix ---------------------
CREATE OR REPLACE FUNCTION public.mission_pending_responders(p_mission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  m record;
  r record;
  v_token text;
  v_dist numeric;
  v_out jsonb := '[]'::jsonb;
BEGIN
  SELECT s.id, s.mission_type::text AS mission_type, s.category::text AS category, s.status::text AS status,
         s.latitude::double precision AS lat, s.longitude::double precision AS lng
    INTO m
    FROM public.small_missions s WHERE s.id = p_mission_id;
  -- Besoins ouverts seulement ; un projet garde son propre parcours de choix.
  IF m.id IS NULL OR m.mission_type <> 'besoin' OR m.category = 'projet' OR m.status <> 'open' THEN
    RETURN v_out;
  END IF;

  FOR r IN
    SELECT resp.id, resp.exchange_date, p.first_name, p.helps_with,
           coalesce(p.identity_verified, false) AS verified,
           p.latitude::double precision AS lat, p.longitude::double precision AS lng
      FROM public.small_mission_responses resp
      JOIN public.profiles p ON p.id = resp.responder_id
     WHERE resp.mission_id = p_mission_id
       AND resp.status = 'pending'::small_mission_response_status
     ORDER BY resp.created_at ASC
     LIMIT 10
  LOOP
    v_token := public.emit_mission_choose_token(r.id);
    CONTINUE WHEN v_token IS NULL;
    v_dist := CASE
      WHEN m.lat IS NULL OR m.lng IS NULL OR r.lat IS NULL OR r.lng IS NULL THEN NULL
      ELSE round((6371 * acos(least(1.0, greatest(-1.0,
        cos(radians(m.lat)) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(m.lng))
        + sin(radians(m.lat)) * sin(radians(r.lat))
      ))))::numeric)
    END;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'responseId', r.id,
      'firstName', split_part(coalesce(btrim(r.first_name), ''), ' ', 1),
      'distanceKm', v_dist,
      'helpsWith', nullif(btrim(coalesce(r.helps_with, '')), ''),
      'verified', r.verified,
      'exchangeDate', r.exchange_date,
      'chooseToken', v_token
    ));
  END LOOP;
  RETURN v_out;
END;
$function$;

-- 3. Email mission-response-received avec un bouton par répondant ---------
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
  v_responders jsonb := '[]'::jsonb;
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

    -- Relecture R7 (13/10/2026) : clé du jour (heure de Paris), au plus un
    -- email de réactivation par jour.
    v_idem := 'mission-response-received-' || NEW.id::text
      || CASE WHEN v_reactivated
              THEN '-r' || to_char(now() AT TIME ZONE 'Europe/Paris', 'YYYYMMDD')
              ELSE '' END;

    -- Lot E17 : chaque répondant en attente, avec son bouton « Choisir ».
    -- Un échec de lecture laisse l'email partir sous sa forme simple.
    BEGIN
      v_responders := coalesce(public.mission_pending_responders(NEW.mission_id), '[]'::jsonb);
    EXCEPTION WHEN OTHERS THEN
      v_responders := '[]'::jsonb;
      RAISE WARNING 'notify_new_mission_response[responders] resp=% err=%', NEW.id, SQLERRM;
    END;

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
          'messagePreview', v_preview,
          'responders', v_responders
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

-- 4. Choix par jeton : autres réponses écartées, premier message ----------
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
  -- Lot E17
  v_category text;
  v_title text;
  v_helper_name text;
  v_conv uuid;
BEGIN
  SELECT * INTO t FROM public.mission_action_tokens WHERE token = p_token AND action = 'choose' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF t.used_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_used'); END IF;
  IF t.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  SELECT user_id, category::text, title INTO v_owner, v_category, v_title FROM public.small_missions WHERE id = t.mission_id;
  SELECT id INTO v_response FROM public.small_mission_responses
   WHERE mission_id = t.mission_id AND responder_id = t.helper_id AND status = 'pending';
  IF v_owner IS NULL OR v_response IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'mission_closed'); END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  -- Lot E17 : comme la page du besoin, le choix écarte les autres réponses en
  -- attente (« Merci, c'est pourvu ») ; un projet garde les autres candidatures.
  v_result := public.accept_mission_response(v_response, coalesce(v_category, '') <> 'projet');
  UPDATE public.mission_action_tokens SET used_at = now() WHERE id = t.id;

  -- Lot E17 : la conversation s'ouvre avec le premier message de la page du
  -- besoin, sauf si un échange y figure déjà.
  v_conv := nullif(v_result ->> 'conversation_id', '')::uuid;
  IF v_conv IS NOT NULL THEN
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM public.messages
         WHERE conversation_id = v_conv AND coalesce(is_system, false) = false
      ) THEN
        SELECT initcap(split_part(coalesce(btrim(first_name), ''), ' ', 1)) INTO v_helper_name
          FROM public.profiles WHERE id = t.helper_id;
        INSERT INTO public.messages (conversation_id, sender_id, content)
        VALUES (
          v_conv, v_owner,
          CASE WHEN coalesce(v_helper_name, '') <> '' THEN 'Bonjour ' || v_helper_name || ', merci !' ELSE 'Bonjour, merci !' END
            || ' On se cale quand pour « ' || coalesce(nullif(btrim(v_title), ''), 'ce coup de main') || ' » ?'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'consume_mission_choose_token[premier message] conv=% err=%', v_conv, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'mission_id', t.mission_id, 'response_id', v_response,
    'owner_id', v_owner, 'helper_id', t.helper_id, 'conversation_id', v_conv,
    'declined_responder_ids', coalesce(v_result -> 'declined_responder_ids', '[]'::jsonb),
    'accept', v_result);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'error', 'detail', SQLERRM);
END;
$function$;

-- 5. Intention d'inscription écrite à la création du compte ---------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
  _intent text;
BEGIN
  _role := NEW.raw_user_meta_data ->> 'role';
  -- Lot E17 : intention d'inscription (signup_intent_detected ou choix
  -- « entraide » de l'écran C1), transmise dans les métadonnées.
  _intent := NEW.raw_user_meta_data ->> 'arrival_intent';
  IF _intent IS NOT NULL AND _intent NOT IN ('owner', 'sitter', 'entraide') THEN
    _intent := NULL;
  END IF;

  IF _role IN ('owner','sitter','both') THEN
    INSERT INTO public.profiles (id, email, role, arrival_intent)
    VALUES (NEW.id, NEW.email, _role::public.user_role, _intent)
    ON CONFLICT (id) DO NOTHING;

    IF _role IN ('sitter','both') THEN
      INSERT INTO public.sitter_profiles (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;

    IF _role IN ('owner','both') THEN
      INSERT INTO public.owner_profiles (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  ELSE
    INSERT INTO public.profiles (id, email, arrival_intent)
    VALUES (NEW.id, NEW.email, _intent)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. Relance mission-choose-helper fondue dans la relance à 24 h ----------
DO $unschedule$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-mission-choose-prompt') THEN
    PERFORM cron.unschedule('send-mission-choose-prompt');
  END IF;
EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
  NULL;
END
$unschedule$;

REVOKE ALL ON FUNCTION public.mission_pending_responders(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_mission_choose_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mission_pending_responders(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_mission_choose_token(text) TO service_role;
