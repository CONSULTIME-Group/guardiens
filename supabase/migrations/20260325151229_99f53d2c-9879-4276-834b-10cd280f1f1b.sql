
CREATE OR REPLACE FUNCTION public.notify_long_stay_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_name text;
  v_owner_avatar text;
  v_app record;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    SELECT p.first_name, p.avatar_url INTO v_owner_name, v_owner_avatar
    FROM public.profiles p WHERE p.id = NEW.user_id;

    FOR v_app IN
      SELECT a.sitter_id FROM public.long_stay_applications a
      WHERE a.long_stay_id = NEW.id AND a.status = 'accepted'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
      VALUES (
        v_app.sitter_id,
        'long_stay_confirmed',
        'Garde longue durée confirmée !',
        'Votre garde longue durée « ' || coalesce(NEW.title, 'Sans titre') || ' » est maintenant confirmée.',
        '/long-stays/' || NEW.id,
        v_owner_name,
        v_owner_avatar
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_long_stay_confirmed
  AFTER UPDATE ON public.long_stays
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_long_stay_confirmed();
