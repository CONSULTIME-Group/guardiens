
-- Add cancellation tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cancellation_count integer NOT NULL DEFAULT 0;

-- Add cancellation metadata to sits
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id);
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

-- Trigger: notify on sit cancellation
CREATE OR REPLACE FUNCTION public.notify_sit_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_canceller_name text;
  v_canceller_avatar text;
  v_other_user_id uuid;
  v_app record;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.cancelled_by IS NOT NULL THEN
    SELECT p.first_name, p.avatar_url INTO v_canceller_name, v_canceller_avatar
    FROM public.profiles p WHERE p.id = NEW.cancelled_by;

    -- Increment cancellation count
    UPDATE public.profiles SET cancellation_count = cancellation_count + 1 WHERE id = NEW.cancelled_by;

    -- Notify the owner if sitter cancelled, or the accepted sitter if owner cancelled
    IF NEW.cancelled_by = NEW.user_id THEN
      -- Owner cancelled: notify accepted sitters
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
      -- Sitter cancelled: notify owner
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
      VALUES (
        NEW.user_id, 'sit_cancelled',
        'Garde annulée',
        coalesce(v_canceller_name, 'Le gardien') || ' a annulé la garde « ' || coalesce(NEW.title, '') || ' ».',
        '/sits/' || NEW.id, v_canceller_name, v_canceller_avatar
      );
    END IF;

    -- Check 3+ cancellations for gentle nudge
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

CREATE TRIGGER on_sit_cancelled
  AFTER UPDATE ON public.sits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sit_cancelled();
