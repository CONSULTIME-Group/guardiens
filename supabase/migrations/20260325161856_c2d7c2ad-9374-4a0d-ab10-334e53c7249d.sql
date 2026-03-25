
CREATE OR REPLACE FUNCTION public.notify_application_cancelled_by_sitter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

DROP TRIGGER IF EXISTS on_application_cancelled ON public.applications;
CREATE TRIGGER on_application_cancelled AFTER UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.notify_application_cancelled_by_sitter();
