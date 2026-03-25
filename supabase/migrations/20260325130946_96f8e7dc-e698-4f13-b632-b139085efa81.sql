
-- Add long_stay_id to conversations for long stay messaging
ALTER TABLE public.conversations ADD COLUMN long_stay_id uuid REFERENCES public.long_stays(id) ON DELETE CASCADE;

-- Make sit_id nullable so conversations can be for long stays only
ALTER TABLE public.conversations ALTER COLUMN sit_id DROP NOT NULL;

-- Add notification trigger for long stay applications
CREATE OR REPLACE FUNCTION public.notify_new_long_stay_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ls record;
  v_sitter_name text;
  v_sitter_avatar text;
BEGIN
  SELECT ls.title, ls.user_id INTO v_ls
  FROM public.long_stays ls WHERE ls.id = NEW.long_stay_id;

  SELECT p.first_name, p.avatar_url INTO v_sitter_name, v_sitter_avatar
  FROM public.profiles p WHERE p.id = NEW.sitter_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    v_ls.user_id,
    'new_application',
    'Nouvelle candidature longue durée',
    coalesce(v_sitter_name, 'Un gardien') || ' a postulé pour « ' || coalesce(v_ls.title, 'votre garde longue durée') || ' ».',
    '/long-stays/' || NEW.long_stay_id,
    v_sitter_name,
    v_sitter_avatar
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_long_stay_application
  AFTER INSERT ON public.long_stay_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_long_stay_application();
