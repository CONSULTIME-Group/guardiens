
-- 1) notify_new_application : isolation des blocs + signal admin en cas d'échec
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sit_title    text;
  v_sit_owner    uuid;
  v_sitter_name  text;
  v_sitter_avatar text;
  v_sitter_city  text;
  v_sitter_exp   int;
  v_sitter_exp_label text;
  v_owner_email  text;
  v_owner_prior_apps int;
  v_is_first     boolean := false;
  v_template     text;
  v_idem         text;
  v_preview      text;
  v_service_key  text;
  v_payload      jsonb;
  v_err          text;
BEGIN
  -- Contexte : lectures tolérantes
  BEGIN
    SELECT s.title, s.user_id INTO v_sit_title, v_sit_owner
    FROM public.sits s WHERE s.id = NEW.sit_id;

    SELECT p.first_name, p.avatar_url, p.city
      INTO v_sitter_name, v_sitter_avatar, v_sitter_city
    FROM public.profiles p WHERE p.id = NEW.sitter_id;

    SELECT sp.experience_years INTO v_sitter_exp
    FROM public.sitter_profiles sp WHERE sp.user_id = NEW.sitter_id;

    v_sitter_exp_label := CASE
      WHEN v_sitter_exp IS NULL OR v_sitter_exp = 0 THEN NULL
      WHEN v_sitter_exp = 1 THEN '1 an d''expérience'
      ELSE v_sitter_exp::text || ' ans d''expérience'
    END;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'notify_new_application[context] app=% err=%', NEW.id, v_err;
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
    VALUES ('notification_delivery_failed', 'critical', 'application', NEW.id,
      jsonb_build_object('phase','context','sqlerrm', v_err, 'sit_id', NEW.sit_id, 'sitter_id', NEW.sitter_id));
  END;

  -- Bloc A : notification in-app (isolé)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      v_sit_owner,
      'new_application',
      'Nouvelle candidature',
      coalesce(v_sitter_name, 'Un gardien') || ' a postulé pour « ' || coalesce(v_sit_title, 'votre garde') || ' ».',
      '/sits/' || NEW.sit_id || '#candidatures',
      v_sitter_name,
      v_sitter_avatar
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'notify_new_application[inapp] app=% owner=% err=%', NEW.id, v_sit_owner, v_err;
    BEGIN
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'application', NEW.id,
        jsonb_build_object('phase','in_app','sqlerrm', v_err, 'owner_id', v_sit_owner));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- Bloc B : email au propriétaire (isolé)
  BEGIN
    SELECT p.email INTO v_owner_email
    FROM public.profiles p WHERE p.id = v_sit_owner;

    IF v_owner_email IS NULL OR v_owner_email = '' THEN
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'application', NEW.id,
        jsonb_build_object('phase','email','sqlerrm','owner_email_missing','owner_id', v_sit_owner));
      RETURN NEW;
    END IF;

    SELECT count(*) INTO v_owner_prior_apps
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE s.user_id = v_sit_owner AND a.id <> NEW.id;

    v_is_first := (v_owner_prior_apps = 0);
    v_template := CASE WHEN v_is_first THEN 'first-application-received' ELSE 'new-application' END;
    v_idem     := CASE WHEN v_is_first THEN 'first-application-' ELSE 'new-application-' END || NEW.id::text;
    v_preview  := left(coalesce(NEW.message, ''), 180);

    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_role_key'
    LIMIT 1;

    IF v_service_key IS NULL THEN
      RAISE WARNING 'notify_new_application[email] app=% no vault key', NEW.id;
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'application', NEW.id,
        jsonb_build_object('phase','email','sqlerrm','vault_key_missing'));
      RETURN NEW;
    END IF;

    v_payload := jsonb_build_object(
      'sitterFirstName', coalesce(v_sitter_name, 'Un gardien'),
      'sitTitle', coalesce(v_sit_title, 'votre annonce'),
      'sitId', NEW.sit_id,
      'messagePreview', v_preview,
      'sitterCity', v_sitter_city,
      'sitterExperience', v_sitter_exp_label,
      'sitterAvatarUrl', v_sitter_avatar
    );

    PERFORM net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-transactional-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'templateName', v_template,
        'recipientEmail', v_owner_email,
        'idempotencyKey', v_idem,
        'templateData', v_payload
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'notify_new_application[email] app=% err=%', NEW.id, v_err;
    BEGIN
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'application', NEW.id,
        jsonb_build_object('phase','email','sqlerrm', v_err, 'owner_id', v_sit_owner));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  RETURN NEW;
END;
$function$;

-- 2) trg_notify_new_message_email : même principe, échec = signal admin, jamais bloquant
CREATE OR REPLACE FUNCTION public.trg_notify_new_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url         text := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/notify-new-message';
  v_service_key text;
  v_err         text;
BEGIN
  IF NEW.is_system THEN RETURN NEW; END IF;

  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_role_key'
    LIMIT 1;

    IF v_service_key IS NULL THEN
      RAISE WARNING 'trg_notify_new_message_email: vault key missing';
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'message', NEW.id,
        jsonb_build_object('phase','email','sqlerrm','vault_key_missing','conversation_id', NEW.conversation_id));
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'content', NEW.content,
        'is_system', NEW.is_system
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'trg_notify_new_message_email msg=% err=%', NEW.id, v_err;
    BEGIN
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'message', NEW.id,
        jsonb_build_object('phase','email','sqlerrm', v_err, 'conversation_id', NEW.conversation_id));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  RETURN NEW;
END;
$function$;
