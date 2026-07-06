
-- 1) Extension du RPC de préférences email pour inclure new_mission_digest
CREATE OR REPLACE FUNCTION public.upsert_my_email_preferences(
  p_product boolean,
  p_digest boolean,
  p_alert boolean,
  p_new_mission_digest boolean DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  INSERT INTO public.email_preferences (user_id, product_emails, digest_emails, alert_emails, new_mission_digest)
  VALUES (
    auth.uid(),
    COALESCE(p_product, true),
    COALESCE(p_digest, true),
    COALESCE(p_alert, true),
    COALESCE(p_new_mission_digest, true)
  )
  ON CONFLICT (user_id) DO UPDATE
    SET product_emails = EXCLUDED.product_emails,
        digest_emails = EXCLUDED.digest_emails,
        alert_emails = EXCLUDED.alert_emails,
        new_mission_digest = COALESCE(EXCLUDED.new_mission_digest, public.email_preferences.new_mission_digest),
        updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_my_email_preferences(boolean, boolean, boolean, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.upsert_my_email_preferences(boolean, boolean, boolean, boolean) TO authenticated;

-- 2) Trigger feedback mission → notify-mission-event (event mission_feedback_received)
CREATE OR REPLACE FUNCTION public.tg_notify_mission_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_url IS NULL OR v_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/notify-mission-event',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key
    ),
    body := jsonb_build_object(
      'event_type', 'mission_feedback_received',
      'mission_id', NEW.mission_id,
      'actor_id', NEW.giver_id,
      'target_ids', jsonb_build_array(NEW.receiver_id),
      'metadata', jsonb_build_object(
        'positive', NEW.positive,
        'badge_key', NEW.badge_key
      )
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_notify_mission_feedback failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_mission_feedback ON public.mission_feedbacks;
CREATE TRIGGER trg_notify_mission_feedback
  AFTER INSERT ON public.mission_feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_mission_feedback();

-- 3) Trigger thanks sur réponse mission → notify-mission-event (event mission_thanks_received)
CREATE OR REPLACE FUNCTION public.tg_notify_mission_thanks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
  v_mission_id uuid;
  v_responder_id uuid;
BEGIN
  SELECT r.mission_id, r.responder_id
    INTO v_mission_id, v_responder_id
    FROM public.small_mission_responses r
    WHERE r.id = NEW.response_id;
  IF v_responder_id IS NULL OR v_responder_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_url IS NULL OR v_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/notify-mission-event',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key
    ),
    body := jsonb_build_object(
      'event_type', 'mission_thanks_received',
      'mission_id', v_mission_id,
      'actor_id', NEW.user_id,
      'target_ids', jsonb_build_array(v_responder_id),
      'metadata', jsonb_build_object('response_id', NEW.response_id)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_notify_mission_thanks failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_mission_thanks ON public.small_mission_response_thanks;
CREATE TRIGGER trg_notify_mission_thanks
  AFTER INSERT ON public.small_mission_response_thanks
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_mission_thanks();
