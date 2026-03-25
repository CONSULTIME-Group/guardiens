
CREATE OR REPLACE FUNCTION public.notify_long_stay_application_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_name text;
  v_owner_avatar text;
  v_ls_title text;
  v_owner_id uuid;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    SELECT ls.title, ls.user_id INTO v_ls_title, v_owner_id
    FROM public.long_stays ls WHERE ls.id = NEW.long_stay_id;

    SELECT p.first_name, p.avatar_url INTO v_owner_name, v_owner_avatar
    FROM public.profiles p WHERE p.id = v_owner_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      NEW.sitter_id,
      'application_accepted',
      'Candidature longue durée acceptée !',
      coalesce(v_owner_name, 'Le propriétaire') || ' a accepté votre candidature pour « ' || coalesce(v_ls_title, 'une garde longue durée') || ' ».',
      '/long-stays/' || NEW.long_stay_id,
      v_owner_name,
      v_owner_avatar
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_long_stay_application_accepted
  AFTER UPDATE ON public.long_stay_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_long_stay_application_accepted();
