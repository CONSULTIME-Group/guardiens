
-- 1) Jetons d'action de candidature (usage unique, 30 jours)
CREATE TABLE IF NOT EXISTS public.application_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('decline','thinking')),
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz
);

GRANT ALL ON public.application_action_tokens TO service_role;
ALTER TABLE public.application_action_tokens ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS application_action_tokens_active_uniq
  ON public.application_action_tokens (application_id, action)
  WHERE used_at IS NULL;

-- 2) Emission d'un jeton (reutilise le jeton actif s'il existe)
CREATE OR REPLACE FUNCTION public.issue_application_action_token(
  p_application_id uuid,
  p_action text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_token text;
BEGIN
  IF p_action NOT IN ('decline','thinking') THEN
    RAISE EXCEPTION 'unsupported_action';
  END IF;

  SELECT token INTO v_token
  FROM public.application_action_tokens
  WHERE application_id = p_application_id
    AND action = p_action
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF v_token IS NOT NULL THEN
    RETURN v_token;
  END IF;

  DELETE FROM public.application_action_tokens
  WHERE application_id = p_application_id
    AND action = p_action
    AND used_at IS NULL
    AND expires_at <= now();

  INSERT INTO public.application_action_tokens (application_id, action, token)
  VALUES (p_application_id, p_action, encode(gen_random_bytes(32), 'hex'))
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$fn$;

REVOKE ALL ON FUNCTION public.issue_application_action_token(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_application_action_token(uuid, text) TO service_role;

-- 3) Lecture d'un jeton sans consommation (page de confirmation)
CREATE OR REPLACE FUNCTION public.peek_application_action_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  r record;
BEGIN
  SELECT t.*, a.status AS app_status, a.sit_id, s.title AS sit_title,
         ps.first_name AS sitter_first_name
  INTO r
  FROM public.application_action_tokens t
  JOIN public.applications a ON a.id = t.application_id
  LEFT JOIN public.sits s ON s.id = a.sit_id
  LEFT JOIN public.profiles ps ON ps.id = a.sitter_id
  WHERE t.token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;
  IF r.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_used', 'action', r.action);
  END IF;
  IF r.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired', 'action', r.action);
  END IF;
  IF r.app_status NOT IN ('pending','viewed','discussing') THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_answered', 'action', r.action);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'action', r.action,
    'sit_title', coalesce(r.sit_title, ''),
    'sitter_first_name', coalesce(r.sitter_first_name, '')
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.peek_application_action_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.peek_application_action_token(text) TO service_role;

-- 4) Consommation du jeton (usage unique, action non destructrice uniquement)
CREATE OR REPLACE FUNCTION public.consume_application_action_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  r record;
  v_prior int;
  v_sitter_email text;
  v_owner_name text;
BEGIN
  SELECT * INTO r
  FROM public.application_action_tokens
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  IF r.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;
  IF r.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF r.action = 'thinking' THEN
    SELECT count(*) INTO v_prior
    FROM public.application_action_tokens
    WHERE application_id = r.application_id
      AND action = 'thinking'
      AND used_at IS NOT NULL;
    IF v_prior > 0 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
    END IF;
  END IF;

  UPDATE public.application_action_tokens
  SET used_at = now()
  WHERE id = r.id;

  PERFORM set_config('app.quick_action', '1', true);

  IF r.action = 'decline' THEN
    UPDATE public.applications
    SET status = 'rejected'::application_status
    WHERE id = r.application_id
      AND status IN ('pending','viewed','discussing');
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'already_answered');
    END IF;
  END IF;

  PERFORM set_config('app.quick_action', '0', true);

  SELECT ps.email, po.first_name
  INTO v_sitter_email, v_owner_name
  FROM public.applications a
  JOIN public.profiles ps ON ps.id = a.sitter_id
  JOIN public.sits s ON s.id = a.sit_id
  LEFT JOIN public.profiles po ON po.id = s.user_id
  WHERE a.id = r.application_id;

  RETURN jsonb_build_object(
    'ok', true,
    'action', r.action,
    'application_id', r.application_id,
    'sitter_email', v_sitter_email,
    'owner_first_name', coalesce(v_owner_name, ''),
    'sit_title', (SELECT coalesce(s.title, '') FROM public.applications a JOIN public.sits s ON s.id = a.sit_id WHERE a.id = r.application_id),
    'sitter_first_name', (SELECT coalesce(p.first_name, '') FROM public.applications a JOIN public.profiles p ON p.id = a.sitter_id WHERE a.id = r.application_id),
    'sit_city', (SELECT coalesce(s.city, '') FROM public.applications a JOIN public.sits s ON s.id = a.sit_id WHERE a.id = r.application_id)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.consume_application_action_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_application_action_token(text) TO service_role;

-- 5) Les gardes de statut laissent passer uniquement le refus par jeton
CREATE OR REPLACE FUNCTION public.applications_guard_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_owner uuid;
BEGIN
  IF coalesce(current_setting('app.quick_action', true), '') = '1' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT s.user_id INTO v_owner FROM public.sits s WHERE s.id = OLD.sit_id;
    IF auth.uid() IS DISTINCT FROM v_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only the sit owner can change application status';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.enforce_application_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  is_owner boolean;
  v_via_rpc text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF coalesce(current_setting('app.quick_action', true), '') = '1' THEN
    IF NEW.status = 'rejected'::application_status
       AND OLD.status IN ('pending'::application_status, 'viewed'::application_status, 'discussing'::application_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'quick_action_forbidden_transition' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.sits s
    WHERE s.id = NEW.sit_id AND s.user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner THEN
    IF NEW.status = 'accepted'::application_status THEN
      v_via_rpc := current_setting('app.via_accept_rpc', true);
      IF v_via_rpc IS DISTINCT FROM '1' THEN
        RAISE EXCEPTION
          'must_use_accept_rpc: acceptez la candidature via la RPC accept_application'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    IF OLD.status = 'rejected'::application_status
       AND NEW.status <> 'pending'::application_status THEN
      RAISE EXCEPTION
        'invalid_transition_from_rejected: seule la reouverture (rejected -> pending) est autorisee'
        USING ERRCODE = '22023';
    END IF;

    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.sitter_id THEN
    IF NEW.status IN ('cancelled'::application_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Sitters can only withdraw their application (status=cancelled).';
  END IF;

  RAISE EXCEPTION 'Not authorized to change application status.';
END;
$fn$;

-- 6) Le trigger de nouvelle candidature transporte les deux liens d'action
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

    v_decline_token := public.issue_application_action_token(NEW.id, 'decline');
    v_thinking_token := public.issue_application_action_token(NEW.id, 'thinking');

    v_payload := jsonb_build_object(
      'sitterFirstName', coalesce(v_sitter_name, 'Un gardien'),
      'sitTitle', coalesce(v_sit_title, 'votre annonce'),
      'sitId', NEW.sit_id,
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
