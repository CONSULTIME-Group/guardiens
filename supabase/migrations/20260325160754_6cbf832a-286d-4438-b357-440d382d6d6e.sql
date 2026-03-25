
CREATE OR REPLACE FUNCTION public.notify_long_stay_application_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sitter_name text;
  v_sitter_avatar text;
  v_ls_title text;
  v_owner_id uuid;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    SELECT ls.title, ls.user_id INTO v_ls_title, v_owner_id
    FROM public.long_stays ls WHERE ls.id = NEW.long_stay_id;

    SELECT p.first_name, p.avatar_url INTO v_sitter_name, v_sitter_avatar
    FROM public.profiles p WHERE p.id = NEW.sitter_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      v_owner_id,
      'long_stay_application_cancelled',
      'Candidature longue durée annulée',
      coalesce(v_sitter_name, 'Un gardien') || ' a annulé sa candidature pour « ' || coalesce(v_ls_title, 'votre garde longue durée') || ' ».',
      '/long-stays/' || NEW.long_stay_id,
      v_sitter_name,
      v_sitter_avatar
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_application ON public.applications;
CREATE TRIGGER on_new_application AFTER INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

DROP TRIGGER IF EXISTS on_application_accepted ON public.applications;
CREATE TRIGGER on_application_accepted AFTER UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.notify_application_accepted();

DROP TRIGGER IF EXISTS on_sit_confirmed ON public.sits;
CREATE TRIGGER on_sit_confirmed AFTER UPDATE ON public.sits FOR EACH ROW EXECUTE FUNCTION public.notify_sit_confirmed();

DROP TRIGGER IF EXISTS on_sit_cancelled ON public.sits;
CREATE TRIGGER on_sit_cancelled AFTER UPDATE ON public.sits FOR EACH ROW EXECUTE FUNCTION public.notify_sit_cancelled();

DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

DROP TRIGGER IF EXISTS on_review_published ON public.reviews;
CREATE TRIGGER on_review_published AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.auto_publish_reviews();

DROP TRIGGER IF EXISTS on_review_notify ON public.reviews;
CREATE TRIGGER on_review_notify AFTER UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.notify_review_published();

DROP TRIGGER IF EXISTS on_sitter_available ON public.sitter_profiles;
CREATE TRIGGER on_sitter_available AFTER UPDATE ON public.sitter_profiles FOR EACH ROW EXECUTE FUNCTION public.notify_owners_sitter_available();

DROP TRIGGER IF EXISTS on_new_long_stay_application ON public.long_stay_applications;
CREATE TRIGGER on_new_long_stay_application AFTER INSERT ON public.long_stay_applications FOR EACH ROW EXECUTE FUNCTION public.notify_new_long_stay_application();

DROP TRIGGER IF EXISTS on_long_stay_application_accepted ON public.long_stay_applications;
CREATE TRIGGER on_long_stay_application_accepted AFTER UPDATE ON public.long_stay_applications FOR EACH ROW EXECUTE FUNCTION public.notify_long_stay_application_accepted();

DROP TRIGGER IF EXISTS on_long_stay_application_cancelled ON public.long_stay_applications;
CREATE TRIGGER on_long_stay_application_cancelled AFTER UPDATE ON public.long_stay_applications FOR EACH ROW EXECUTE FUNCTION public.notify_long_stay_application_cancelled();

DROP TRIGGER IF EXISTS on_long_stay_confirmed ON public.long_stays;
CREATE TRIGGER on_long_stay_confirmed AFTER UPDATE ON public.long_stays FOR EACH ROW EXECUTE FUNCTION public.notify_long_stay_confirmed();

DROP TRIGGER IF EXISTS on_long_stay_cancelled ON public.long_stays;
CREATE TRIGGER on_long_stay_cancelled AFTER UPDATE ON public.long_stays FOR EACH ROW EXECUTE FUNCTION public.notify_long_stay_cancelled();
