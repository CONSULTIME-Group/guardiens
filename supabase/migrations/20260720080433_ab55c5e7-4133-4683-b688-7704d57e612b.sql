
-- 1) Garde serveur d'éligibilité (author_id) sur questions et réponses
CREATE OR REPLACE FUNCTION public.enforce_community_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_completion int;
  v_status text;
BEGIN
  v_user_id := NEW.author_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(v_user_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(profile_completion, 0), COALESCE(account_status, 'active')
    INTO v_completion, v_status
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'account_not_active'
      USING ERRCODE = 'P0001', HINT = 'account_not_active';
  END IF;

  IF v_completion < 60 THEN
    RAISE EXCEPTION 'profile_incomplete: %', v_completion
      USING ERRCODE = 'P0001', HINT = 'profile_incomplete';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cq_enforce_eligibility ON public.community_questions;
CREATE TRIGGER trg_cq_enforce_eligibility
  BEFORE INSERT ON public.community_questions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_community_eligibility();

DROP TRIGGER IF EXISTS trg_ca_enforce_eligibility ON public.community_answers;
CREATE TRIGGER trg_ca_enforce_eligibility
  BEFORE INSERT ON public.community_answers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_community_eligibility();

-- 2) Notification à l'auteur de la question à chaque nouvelle réponse
CREATE OR REPLACE FUNCTION public.notify_new_community_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_question_title text;
  v_question_author uuid;
  v_answerer_name text;
  v_answerer_avatar text;
  v_author_email text;
  v_service_key text;
  v_preview text;
  v_err text;
BEGIN
  SELECT q.title, q.author_id INTO v_question_title, v_question_author
  FROM public.community_questions q WHERE q.id = NEW.question_id;

  IF v_question_author IS NULL OR v_question_author = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT p.first_name, p.avatar_url INTO v_answerer_name, v_answerer_avatar
  FROM public.profiles p WHERE p.id = NEW.author_id;

  v_preview := left(coalesce(NEW.body, ''), 220);

  -- A) In-app
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      v_question_author,
      'question_answer_received',
      'Nouvelle réponse à votre question',
      coalesce(v_answerer_name, 'Un membre') || ' a répondu à « ' || coalesce(v_question_title, 'votre question') || ' ».',
      '/questions/' || NEW.question_id,
      v_answerer_name,
      v_answerer_avatar
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'notify_new_community_answer[inapp] ans=% err=%', NEW.id, v_err;
    BEGIN
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'community_answer', NEW.id,
        jsonb_build_object('phase','in_app','sqlerrm', v_err, 'author_id', v_question_author));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- B) Email
  BEGIN
    SELECT p.email INTO v_author_email FROM public.profiles p WHERE p.id = v_question_author;
    IF v_author_email IS NULL OR v_author_email = '' THEN
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
        'templateName', 'question-answer-received',
        'recipientEmail', v_author_email,
        'idempotencyKey', 'question-answer-received-' || NEW.id::text,
        'templateData', jsonb_build_object(
          'answererFirstName', coalesce(v_answerer_name, 'Un membre'),
          'questionTitle', coalesce(v_question_title, 'votre question'),
          'questionId', NEW.question_id,
          'bodyPreview', v_preview
        ),
        'metadata', jsonb_build_object('question_id', NEW.question_id, 'answer_id', NEW.id)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'notify_new_community_answer[email] ans=% err=%', NEW.id, v_err;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ca_notify_new ON public.community_answers;
CREATE TRIGGER trg_ca_notify_new
  AFTER INSERT ON public.community_answers
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_community_answer();
