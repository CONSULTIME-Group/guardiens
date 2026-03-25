
-- 1. Notification on new application: notify the sit owner
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sit record;
  v_sitter_name text;
BEGIN
  -- Get the sit info
  SELECT s.title, s.user_id INTO v_sit
  FROM public.sits s WHERE s.id = NEW.sit_id;

  -- Get sitter name
  SELECT p.first_name INTO v_sitter_name
  FROM public.profiles p WHERE p.id = NEW.sitter_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_sit.user_id,
    'new_application',
    'Nouvelle candidature',
    coalesce(v_sitter_name, 'Un gardien') || ' a postulé pour « ' || coalesce(v_sit.title, 'votre garde') || ' ».',
    '/sits/' || NEW.sit_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_application
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_application();

-- 2. Notification on sit confirmed: notify the accepted sitter
CREATE OR REPLACE FUNCTION public.notify_sit_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app record;
BEGIN
  -- Only trigger when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Find the accepted application's sitter
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

CREATE TRIGGER on_sit_confirmed
  AFTER UPDATE ON public.sits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sit_confirmed();

-- 3. Notification on review published: notify the reviewee
CREATE OR REPLACE FUNCTION public.notify_review_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reviewer_name text;
BEGIN
  -- Only trigger when published changes to true
  IF NEW.published = true AND (OLD.published = false OR OLD.published IS NULL) THEN
    SELECT p.first_name INTO v_reviewer_name
    FROM public.profiles p WHERE p.id = NEW.reviewer_id;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.reviewee_id,
      'review_published',
      'Nouvel avis reçu',
      coalesce(v_reviewer_name, 'Quelqu''un') || ' vous a laissé un avis (' || NEW.overall_rating || '/5).',
      '/sits/' || NEW.sit_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_published
  AFTER UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_review_published();
