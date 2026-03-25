
CREATE OR REPLACE FUNCTION public.notify_application_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

DROP TRIGGER IF EXISTS on_application_rejected ON public.applications;
CREATE TRIGGER on_application_rejected AFTER UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.notify_application_rejected();
