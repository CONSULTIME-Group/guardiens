
-- Add actor_avatar_url to notifications for richer display
ALTER TABLE public.notifications ADD COLUMN actor_avatar_url text;
ALTER TABLE public.notifications ADD COLUMN actor_name text;

-- 1. Notification on new message: notify the other participant
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv record;
  v_recipient_id uuid;
  v_sender_name text;
  v_sender_avatar text;
  v_sit_title text;
BEGIN
  -- Skip system messages
  IF NEW.is_system THEN RETURN NEW; END IF;

  -- Get conversation
  SELECT c.owner_id, c.sitter_id, c.sit_id INTO v_conv
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  -- Determine recipient
  v_recipient_id := CASE WHEN v_conv.owner_id = NEW.sender_id THEN v_conv.sitter_id ELSE v_conv.owner_id END;

  -- Get sender info
  SELECT p.first_name, p.avatar_url INTO v_sender_name, v_sender_avatar
  FROM public.profiles p WHERE p.id = NEW.sender_id;

  -- Get sit title
  SELECT s.title INTO v_sit_title FROM public.sits s WHERE s.id = v_conv.sit_id;

  -- Don't spam: check if there's already an unread message notification from same sender in last 30 min
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

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- 2. Notification on application accepted: notify the sitter
CREATE OR REPLACE FUNCTION public.notify_application_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_name text;
  v_owner_avatar text;
  v_sit_title text;
  v_sit_id uuid;
BEGIN
  -- Only when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Get sit info
    SELECT s.title, s.id, s.user_id INTO v_sit_title, v_sit_id
    FROM public.sits s WHERE s.id = NEW.sit_id;

    -- Get owner info
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

CREATE TRIGGER on_application_accepted
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_accepted();

-- Update existing triggers to include actor info

-- Update new_application trigger
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Update review published trigger
CREATE OR REPLACE FUNCTION public.notify_review_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Update sitter available trigger
CREATE OR REPLACE FUNCTION public.notify_owners_sitter_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sitter_city text;
  sitter_name text;
  sitter_avatar text;
  owner_record record;
BEGIN
  IF NEW.is_available = true AND (OLD.is_available = false OR OLD.is_available IS NULL) THEN
    SELECT p.city, p.first_name, p.avatar_url INTO sitter_city, sitter_name, sitter_avatar
    FROM public.profiles p WHERE p.id = NEW.user_id;

    IF sitter_city IS NULL OR sitter_city = '' THEN RETURN NEW; END IF;

    FOR owner_record IN
      SELECT p.id FROM public.profiles p
      WHERE p.role IN ('owner', 'both') AND p.id != NEW.user_id AND lower(p.city) = lower(sitter_city)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
      VALUES (
        owner_record.id, 'sitter_available', 'Nouveau gardien disponible',
        coalesce(sitter_name, 'Un gardien') || ' est maintenant disponible dans votre zone (' || sitter_city || ').',
        '/search', sitter_name, sitter_avatar
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
