-- 1) Trigger transitions : durcissement + réouverture owner
CREATE OR REPLACE FUNCTION public.enforce_application_status_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  v_via_rpc text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
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
$$;

-- 2) accept_application : marqueur app.via_accept_rpc pose en debut de RPC
CREATE OR REPLACE FUNCTION public.accept_application(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sit_id uuid;
  v_owner_id uuid;
  v_current_status application_status;
  v_sit_status sit_status;
  v_auto_rejected integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.via_accept_rpc', '1', true);

  SELECT a.sit_id, a.status, s.user_id, s.status
    INTO v_sit_id, v_current_status, v_owner_id, v_sit_status
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  WHERE a.id = p_application_id;

  IF v_sit_id IS NULL THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF v_current_status NOT IN ('pending', 'viewed', 'discussing') THEN
    RAISE EXCEPTION 'application_not_pending: %', v_current_status USING ERRCODE = '22023';
  END IF;

  IF v_sit_status IN ('confirmed', 'in_progress', 'completed', 'cancelled', 'archived') THEN
    RAISE EXCEPTION 'sit_not_open: %', v_sit_status USING ERRCODE = '22023';
  END IF;

  UPDATE applications SET status = 'accepted' WHERE id = p_application_id;

  WITH rej AS (
    UPDATE applications
       SET status = 'rejected'
     WHERE sit_id = v_sit_id
       AND id <> p_application_id
       AND status IN ('pending', 'viewed', 'discussing')
    RETURNING 1
  )
  SELECT count(*) INTO v_auto_rejected FROM rej;

  UPDATE sits
     SET status = 'confirmed',
         accepting_applications = false,
         updated_at = now()
   WHERE id = v_sit_id;

  BEGIN
    INSERT INTO sit_status_history (sit_id, old_status, new_status, changed_by, reason)
    VALUES (v_sit_id, v_sit_status::text, 'confirmed', auth.uid(), 'application_accepted');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'sit_id', v_sit_id,
    'accepted_application_id', p_application_id,
    'auto_rejected_count', v_auto_rejected
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_application(uuid) TO authenticated;

-- 3) reopen_application : reouverture d'une candidature declinee
CREATE OR REPLACE FUNCTION public.reopen_application(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sit_id uuid;
  v_sitter_id uuid;
  v_owner_id uuid;
  v_current_status application_status;
  v_sit_status sit_status;
  v_sit_title text;
  v_owner_first_name text;
  v_owner_avatar text;
  v_sitter_email text;
  v_service_key text;
  v_err text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT a.sit_id, a.sitter_id, a.status, s.user_id, s.status, s.title
    INTO v_sit_id, v_sitter_id, v_current_status, v_owner_id, v_sit_status, v_sit_title
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  WHERE a.id = p_application_id;

  IF v_sit_id IS NULL THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF v_current_status <> 'rejected'::application_status THEN
    RAISE EXCEPTION 'application_not_rejected: %', v_current_status USING ERRCODE = '22023';
  END IF;

  IF v_sit_status <> 'published'::sit_status THEN
    RAISE EXCEPTION 'sit_not_open_for_reopen: %', v_sit_status USING ERRCODE = '22023';
  END IF;

  UPDATE applications
     SET status = 'pending',
         viewed_at = NULL
   WHERE id = p_application_id;

  BEGIN
    SELECT p.first_name, p.avatar_url
      INTO v_owner_first_name, v_owner_avatar
    FROM public.profiles p WHERE p.id = v_owner_id;

    INSERT INTO messages (conversation_id, sender_id, content, is_system, metadata)
    SELECT c.id, auth.uid(),
      coalesce(v_owner_first_name, 'Le proprietaire')
        || ' a rouvert votre candidature pour '
        || coalesce(v_sit_title, 'une garde') || '. Vous pouvez reprendre la discussion.',
      true,
      jsonb_build_object(
        'action', 'reopened',
        'actor', 'proprio',
        'actor_id', v_owner_id,
        'actor_name', v_owner_first_name
      )
    FROM conversations c
    WHERE c.sit_id = v_sit_id
      AND c.sitter_id = v_sitter_id;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'reopen_application[message] app=% err=%', p_application_id, v_err;
  END;

  BEGIN
    INSERT INTO notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      v_sitter_id,
      'application_reopened',
      'Candidature rouverte',
      coalesce(v_owner_first_name, 'Le proprietaire')
        || ' a rouvert votre candidature pour '
        || coalesce(v_sit_title, 'une garde') || '.',
      '/mes-candidatures',
      v_owner_first_name,
      v_owner_avatar
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'reopen_application[notif] app=% err=%', p_application_id, v_err;
  END;

  BEGIN
    SELECT p.email INTO v_sitter_email
    FROM public.profiles p WHERE p.id = v_sitter_id;

    IF v_sitter_email IS NULL OR v_sitter_email = '' THEN
      RAISE WARNING 'reopen_application[email] app=% sitter_email_missing', p_application_id;
    ELSE
      SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_service_role_key'
      LIMIT 1;

      IF v_service_key IS NOT NULL THEN
        PERFORM net.http_post(
          url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-transactional-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
          ),
          body := jsonb_build_object(
            'templateName', 'application-reopened',
            'recipientEmail', v_sitter_email,
            'idempotencyKey', 'app-reopened-' || p_application_id::text
              || '-' || extract(epoch from now())::bigint::text,
            'templateData', jsonb_build_object(
              'sitTitle', coalesce(v_sit_title, 'votre garde'),
              'ownerFirstName', coalesce(v_owner_first_name, 'Le proprietaire'),
              'sitId', v_sit_id
            )
          )
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'reopen_application[email] app=% err=%', p_application_id, v_err;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'sitter_id', v_sitter_id,
    'sit_id', v_sit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_application(uuid) TO authenticated;