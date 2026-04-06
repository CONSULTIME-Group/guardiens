
-- 1. Drop unused long stay functions
DROP FUNCTION IF EXISTS notify_long_stay_confirmed() CASCADE;
DROP FUNCTION IF EXISTS notify_long_stay_cancelled() CASCADE;

-- 2. Recreate notification functions with proper search_path

CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_sit record;
  v_sitter_name text;
  v_sitter_avatar text;
BEGIN
  SELECT s.title, s.user_id INTO v_sit
  FROM public.sits s WHERE s.id = NEW.sit_id;

  SELECT p.first_name, p.avatar_url INTO v_sitter_name, v_sitter_avatar
  FROM public.profiles p WHERE p.id = NEW.sitter_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    v_sit.user_id,
    'new_application',
    'Nouvelle candidature',
    coalesce(v_sitter_name, 'Un gardien') || ' a postulé pour « ' || coalesce(v_sit.title, 'votre garde') || ' ».',
    '/sits/' || NEW.sit_id,
    v_sitter_name,
    v_sitter_avatar
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_sit_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_app record;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    FOR v_app IN
      SELECT a.sitter_id FROM public.applications a
      WHERE a.sit_id = NEW.id AND a.status = 'accepted'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_app.sitter_id,
        'sit_confirmed',
        'Garde confirmée !',
        'Votre garde « ' || coalesce(NEW.title, 'Sans titre') || ' » est maintenant confirmée.',
        '/sits/' || NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_sit_cancelled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_canceller_name text;
  v_canceller_avatar text;
  v_app record;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.cancelled_by IS NOT NULL THEN
    SELECT p.first_name, p.avatar_url INTO v_canceller_name, v_canceller_avatar
    FROM public.profiles p WHERE p.id = NEW.cancelled_by;

    UPDATE public.profiles SET cancellation_count = cancellation_count + 1 WHERE id = NEW.cancelled_by;

    IF NEW.cancelled_by = NEW.user_id THEN
      FOR v_app IN
        SELECT a.sitter_id FROM public.applications a
        WHERE a.sit_id = NEW.id AND a.status = 'accepted'
      LOOP
        INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
        VALUES (
          v_app.sitter_id, 'sit_cancelled',
          'Garde annulée',
          coalesce(v_canceller_name, 'Le propriétaire') || ' a annulé la garde « ' || coalesce(NEW.title, '') || ' ».',
          '/sits/' || NEW.id, v_canceller_name, v_canceller_avatar
        );
      END LOOP;
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
      VALUES (
        NEW.user_id, 'sit_cancelled',
        'Garde annulée',
        coalesce(v_canceller_name, 'Le gardien') || ' a annulé la garde « ' || coalesce(NEW.title, '') || ' ».',
        '/sits/' || NEW.id, v_canceller_name, v_canceller_avatar
      );
    END IF;

    IF (SELECT cancellation_count FROM public.profiles WHERE id = NEW.cancelled_by) >= 3 THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.cancelled_by, 'info',
        'Un petit mot...',
        'On a remarqué plusieurs annulations récentes. Tout va bien ? Si vous avez besoin d''aide, on est là.',
        '/settings'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_application_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_owner_name text;
  v_owner_avatar text;
  v_sit_title text;
  v_sit_id uuid;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    SELECT s.title, s.id INTO v_sit_title, v_sit_id
    FROM public.sits s WHERE s.id = NEW.sit_id;

    SELECT p.first_name, p.avatar_url INTO v_owner_name, v_owner_avatar
    FROM public.profiles p
    JOIN public.sits s ON s.user_id = p.id
    WHERE s.id = NEW.sit_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      NEW.sitter_id,
      'application_accepted',
      'Candidature acceptée !',
      coalesce(v_owner_name, 'Le propriétaire') || ' a accepté votre candidature pour « ' || coalesce(v_sit_title, 'une garde') || ' ».',
      '/sits/' || v_sit_id,
      v_owner_name,
      v_owner_avatar
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_application_rejected()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_owner_name text;
  v_owner_avatar text;
  v_sit_title text;
BEGIN
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    SELECT s.title INTO v_sit_title FROM public.sits s WHERE s.id = NEW.sit_id;

    SELECT p.first_name, p.avatar_url INTO v_owner_name, v_owner_avatar
    FROM public.profiles p
    JOIN public.sits s ON s.user_id = p.id
    WHERE s.id = NEW.sit_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      NEW.sitter_id,
      'application_rejected',
      'Candidature déclinée',
      coalesce(v_owner_name, 'Le propriétaire') || ' a décliné votre candidature pour « ' || coalesce(v_sit_title, 'une garde') || ' ».',
      '/sits/' || NEW.sit_id,
      v_owner_name,
      v_owner_avatar
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_application_cancelled_by_sitter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_sit_title text;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    SELECT s.title INTO v_sit_title FROM public.sits s WHERE s.id = NEW.sit_id;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.sitter_id,
      'application_cancelled',
      'Candidature annulée',
      'Votre candidature pour « ' || coalesce(v_sit_title, 'une garde') || ' » a bien été annulée.',
      '/sits/' || NEW.sit_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_conv record;
  v_recipient_id uuid;
  v_sender_name text;
  v_sender_avatar text;
  v_sit_title text;
BEGIN
  IF NEW.is_system THEN RETURN NEW; END IF;

  SELECT c.owner_id, c.sitter_id, c.sit_id INTO v_conv
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  v_recipient_id := CASE WHEN v_conv.owner_id = NEW.sender_id THEN v_conv.sitter_id ELSE v_conv.owner_id END;

  SELECT p.first_name, p.avatar_url INTO v_sender_name, v_sender_avatar
  FROM public.profiles p WHERE p.id = NEW.sender_id;

  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_recipient_id
    AND type = 'new_message'
    AND read_at IS NULL
    AND created_at > now() - interval '30 minutes'
    AND body LIKE '%' || coalesce(v_sender_name, '') || '%'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    v_recipient_id,
    'new_message',
    'Nouveau message',
    coalesce(v_sender_name, 'Quelqu''un') || ' vous a envoyé un message',
    '/messages',
    v_sender_name,
    v_sender_avatar
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_review_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_reviewer_name text;
  v_reviewer_avatar text;
BEGIN
  IF NEW.published = true AND (OLD.published = false OR OLD.published IS NULL) THEN
    SELECT p.first_name, p.avatar_url INTO v_reviewer_name, v_reviewer_avatar
    FROM public.profiles p WHERE p.id = NEW.reviewer_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      NEW.reviewee_id,
      'review_published',
      'Nouvel avis reçu',
      coalesce(v_reviewer_name, 'Quelqu''un') || ' vous a laissé un avis (' || NEW.overall_rating || '/5).',
      '/sits/' || NEW.sit_id,
      v_reviewer_name,
      v_reviewer_avatar
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Fix search_path on remaining functions
ALTER FUNCTION public.get_garde_environments(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.recalculate_cancellations(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.recalculate_completed_sits(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_completed_sits_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_min_gardien_sits() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_update_completed_sits_on_sit() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_update_cancellations() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_avis_annulation(uuid, uuid, uuid, text, text) SET search_path = public, pg_temp;
