
-- 1) notify_new_application: in-app notif (avec ancre #candidatures) + email transactionnel via HTTP service_role
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sit          record;
  v_sitter_name  text;
  v_sitter_avatar text;
  v_sitter_city  text;
  v_sitter_exp   int;
  v_owner_email  text;
  v_owner_prior_apps int;
  v_is_first     boolean := false;
  v_template     text;
  v_idem         text;
  v_preview      text;
  v_service_key  text;
BEGIN
  SELECT s.title, s.user_id INTO v_sit
  FROM public.sits s WHERE s.id = NEW.sit_id;

  SELECT p.first_name, p.avatar_url, p.city
    INTO v_sitter_name, v_sitter_avatar, v_sitter_city
  FROM public.profiles p WHERE p.id = NEW.sitter_id;

  SELECT sp.experience_years INTO v_sitter_exp
  FROM public.sitter_profiles sp WHERE sp.user_id = NEW.sitter_id;

  -- Notification in-app (lien avec ancre #candidatures)
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    v_sit.user_id,
    'new_application',
    'Nouvelle candidature',
    coalesce(v_sitter_name, 'Un gardien') || ' a postulé pour « ' || coalesce(v_sit.title, 'votre garde') || ' ».',
    '/sits/' || NEW.sit_id || '#candidatures',
    v_sitter_name,
    v_sitter_avatar
  );

  -- Email : lu côté serveur (bypass RLS)
  SELECT p.email INTO v_owner_email
  FROM public.profiles p WHERE p.id = v_sit.user_id;

  IF v_owner_email IS NULL OR v_owner_email = '' THEN
    RETURN NEW;
  END IF;

  -- Détection première candidature reçue par ce propriétaire (toutes annonces confondues, hors celle-ci)
  SELECT count(*) INTO v_owner_prior_apps
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  WHERE s.user_id = v_sit.user_id
    AND a.id <> NEW.id;

  v_is_first := (v_owner_prior_apps = 0);
  v_template := CASE WHEN v_is_first THEN 'first-application-received' ELSE 'new-application' END;
  v_idem := CASE WHEN v_is_first THEN 'first-application-' ELSE 'new-application-' END || NEW.id::text;
  v_preview := left(coalesce(NEW.message, ''), 180);

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'notify_new_application: supabase_service_role_key not found in vault, skipping email';
    RETURN NEW;
  END IF;

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
      'templateData', CASE
        WHEN v_is_first THEN jsonb_build_object(
          'sitterFirstName', coalesce(v_sitter_name, 'Un gardien'),
          'sitTitle', coalesce(v_sit.title, 'votre annonce'),
          'messagePreview', v_preview,
          'sitterCity', v_sitter_city,
          'sitterExperience', v_sitter_exp
        )
        ELSE jsonb_build_object(
          'sitterFirstName', coalesce(v_sitter_name, 'Un gardien'),
          'sitTitle', coalesce(v_sit.title, 'votre annonce')
        )
      END
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- L'email ne doit JAMAIS bloquer l'INSERT de la candidature
  RAISE WARNING 'notify_new_application email dispatch failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- 2) trg_notify_new_message_email: utiliser la clé service_role du vault au lieu de la clé anonyme
CREATE OR REPLACE FUNCTION public.trg_notify_new_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url         text := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/notify-new-message';
  v_service_key text;
BEGIN
  IF NEW.is_system THEN RETURN NEW; END IF;

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'trg_notify_new_message_email: supabase_service_role_key not found in vault';
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

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_new_message_email dispatch failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
