-- Lot L6 (09/11/2026, arène tableau de bord v2) : la candidature reçue a sa page.
--
-- 1. La notification « Nouvelle candidature » mène à /candidatures/{candidature}
--    (avant : /sits/{annonce}#candidatures, où le propriétaire cherchait la carte).
-- 2. L'email au propriétaire reçoit applicationId : son lien profond mène à la
--    même page (send-transactional-email, gabarits new-application et
--    first-application-received).
-- 3. mark_application_viewed : ouvrir une candidature la marque lue, elle seule
--    (mark_sit_applications_viewed, appelée par la fiche, marque toute l'annonce).
-- Corps des deux fonctions repris à l'identique de la production du 09/11/2026,
-- seuls le lien et applicationId changent.

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
  v_sitter_exp   text;
  v_sitter_exp_label text;
  v_owner_email  text;
  v_owner_prior_apps int;
  v_is_first     boolean := false;
  v_template     text;
  v_idem         text;
  v_preview      text;
  v_service_key  text;
  v_payload      jsonb;
  v_decline_token text;
  v_thinking_token text;
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

    v_sitter_exp_label := NULLIF(v_sitter_exp, '');
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
      '/candidatures/' || NEW.id,
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

    v_decline_token := public.issue_application_action_token(NEW.id, 'decline');
    v_thinking_token := public.issue_application_action_token(NEW.id, 'thinking');

    v_payload := jsonb_build_object(
      'sitterFirstName', coalesce(v_sitter_name, 'Un gardien'),
      'sitTitle', coalesce(v_sit_title, 'votre annonce'),
      'sitId', NEW.sit_id,
      'applicationId', NEW.id,
      'messagePreview', v_preview,
      'sitterCity', v_sitter_city,
      'sitterExperience', v_sitter_exp_label,
      'sitterAvatarUrl', v_sitter_avatar,
      'declineUrl', 'https://guardiens.fr/candidature/reponse?t=' || v_decline_token,
      'thinkingUrl', 'https://guardiens.fr/candidature/reponse?t=' || v_thinking_token
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

CREATE OR REPLACE FUNCTION public.notify_owner_of_new_application(_application_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sitter_id uuid;
  v_sit_id uuid;
  v_owner_id uuid;
  v_sit_title text;
  v_sitter_first_name text;
  v_sitter_avatar text;
  v_notification_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT a.sitter_id, a.sit_id, s.user_id, s.title
    INTO v_sitter_id, v_sit_id, v_owner_id, v_sit_title
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  WHERE a.id = _application_id;

  IF v_sitter_id IS NULL THEN
    RAISE EXCEPTION 'application not found';
  END IF;

  IF v_sitter_id <> auth.uid() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT first_name, avatar_url
    INTO v_sitter_first_name, v_sitter_avatar
  FROM public.profiles
  WHERE id = v_sitter_id;

  v_sitter_first_name := COALESCE(NULLIF(trim(v_sitter_first_name), ''), 'Un gardien');
  v_sit_title := COALESCE(NULLIF(trim(v_sit_title), ''), 'votre annonce');

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    v_owner_id,
    'new_application',
    'Nouvelle candidature',
    v_sitter_first_name || ' a postulé à « ' || v_sit_title || ' ».',
    '/candidatures/' || _application_id::text,
    v_sitter_first_name,
    v_sitter_avatar
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_owner_of_new_application(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_owner_of_new_application(uuid) TO authenticated, service_role;

-- Une candidature ouverte par le propriétaire de l'annonce passe de pending à viewed.
CREATE OR REPLACE FUNCTION public.mark_application_viewed(p_application_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT s.user_id INTO v_owner_id
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  WHERE a.id = p_application_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  WITH updated AS (
    UPDATE public.applications
       SET status = 'viewed'::application_status,
           viewed_at = COALESCE(viewed_at, now())
     WHERE id = p_application_id
       AND status = 'pending'::application_status
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count > 0;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mark_application_viewed(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_application_viewed(uuid) TO authenticated, service_role;
