CREATE OR REPLACE FUNCTION public.track_sit_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sit_status_history (sit_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.sit_status_history (sit_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    IF NEW.status = 'published' AND OLD.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
    IF OLD.status = 'published' AND NEW.status = 'draft' THEN
      NEW.unpublished_at := now();
    END IF;
    IF OLD.status <> 'published' AND NEW.status = 'published' THEN
      NEW.unpublished_at := NULL;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_archive_past_sits()
RETURNS TABLE(started int, ended int, archived_published int, archived_finished int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_started int := 0;
  v_ended int := 0;
  v_arch_pub int := 0;
  v_arch_fin int := 0;
BEGIN
  -- Autorise les cascades internes vers public.profiles (recalcul compteurs).
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);

  WITH u AS (
    UPDATE public.sits SET status = 'in_progress'
     WHERE status = 'confirmed' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
     RETURNING 1
  ) SELECT count(*) INTO v_started FROM u;

  WITH u AS (
    UPDATE public.sits SET status = 'completed'
     WHERE status = 'in_progress' AND end_date < CURRENT_DATE
     RETURNING 1
  ) SELECT count(*) INTO v_ended FROM u;

  WITH u AS (
    UPDATE public.sits SET status = 'archived'
     WHERE status = 'published' AND end_date < CURRENT_DATE
     RETURNING 1
  ) SELECT count(*) INTO v_arch_pub FROM u;

  WITH u AS (
    UPDATE public.sits SET status = 'archived'
     WHERE status IN ('completed','cancelled') AND end_date < CURRENT_DATE - INTERVAL '7 days'
     RETURNING 1
  ) SELECT count(*) INTO v_arch_fin FROM u;

  RETURN QUERY SELECT v_started, v_ended, v_arch_pub, v_arch_fin;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_archive_past_sits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_archive_past_sits() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-archive-past-sits') THEN
    PERFORM cron.unschedule('auto-archive-past-sits');
  END IF;
END $$;

SELECT cron.schedule(
  'auto-archive-past-sits',
  '0 4 * * *',
  $$SELECT public.auto_archive_past_sits();$$
);

SELECT public.auto_archive_past_sits();
