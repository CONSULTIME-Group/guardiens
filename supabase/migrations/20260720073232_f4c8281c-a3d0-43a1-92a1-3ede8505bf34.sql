-- 1. Utility: strip emoji + zero-width + decorative marks, collapse whitespace
CREATE OR REPLACE FUNCTION public.strip_emojis(t text) RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      coalesce(t, ''),
      '[\u2600-\u27BF\U0001F000-\U0001FAFF\uFE0F\u200D\u2705\u2713\u2714\u270C]',
      '', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

GRANT EXECUTE ON FUNCTION public.strip_emojis(text) TO authenticated, service_role;

-- 2. Extend validate_small_mission to silently strip emojis on insert/update
CREATE OR REPLACE FUNCTION public.validate_small_mission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.duration_estimate IS NOT NULL AND NEW.duration_estimate NOT IN ('1-2h', 'half_day', 'several', 'weekend') THEN
    RAISE EXCEPTION 'Invalid duration_estimate: %. Allowed values: 1-2h, half_day, several, weekend', NEW.duration_estimate;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.date_needed IS NOT NULL AND NEW.date_needed < CURRENT_DATE THEN
    RAISE EXCEPTION 'date_needed cannot be in the past';
  END IF;

  -- Charte éditoriale : aucun emoji dans le contenu utilisateur.
  IF NEW.title IS NOT NULL THEN
    NEW.title := public.strip_emojis(NEW.title);
  END IF;
  IF NEW.description IS NOT NULL THEN
    NEW.description := public.strip_emojis(NEW.description);
  END IF;
  IF NEW.exchange_offer IS NOT NULL THEN
    NEW.exchange_offer := public.strip_emojis(NEW.exchange_offer);
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Server-side trigger: notify poster when a response is inserted
CREATE OR REPLACE FUNCTION public.notify_new_mission_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mission_title text;
  v_mission_owner uuid;
  v_responder_name text;
  v_responder_avatar text;
  v_owner_email text;
  v_service_key text;
  v_preview text;
  v_err text;
BEGIN
  SELECT m.title, m.user_id INTO v_mission_title, v_mission_owner
  FROM public.small_missions m WHERE m.id = NEW.mission_id;

  IF v_mission_owner IS NULL OR v_mission_owner = NEW.responder_id THEN
    RETURN NEW;
  END IF;

  SELECT p.first_name, p.avatar_url INTO v_responder_name, v_responder_avatar
  FROM public.profiles p WHERE p.id = NEW.responder_id;

  v_preview := left(coalesce(NEW.message, ''), 220);

  -- A) Notification in-app (isolée)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      v_mission_owner,
      'mission_response_received',
      'Nouvelle réponse à votre coup de main',
      coalesce(v_responder_name, 'Un membre') || ' vous propose son aide pour « ' || coalesce(v_mission_title, 'votre annonce') || ' ».',
      '/petites-missions/' || NEW.mission_id,
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

    PERFORM net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-transactional-email',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'templateName', 'mission-response-received',
        'recipientEmail', v_owner_email,
        'idempotencyKey', 'mission-response-received-' || NEW.id::text,
        'templateData', jsonb_build_object(
          'responderFirstName', coalesce(v_responder_name, 'Un membre'),
          'missionTitle', coalesce(v_mission_title, 'votre annonce'),
          'missionId', NEW.mission_id,
          'messagePreview', v_preview
        ),
        'metadata', jsonb_build_object('mission_id', NEW.mission_id, 'response_id', NEW.id)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'notify_new_mission_response[email] resp=% err=%', NEW.id, v_err;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_mission_response ON public.small_mission_responses;
CREATE TRIGGER trg_notify_new_mission_response
AFTER INSERT ON public.small_mission_responses
FOR EACH ROW EXECUTE FUNCTION public.notify_new_mission_response();