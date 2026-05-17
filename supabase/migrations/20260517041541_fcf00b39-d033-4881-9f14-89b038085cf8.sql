CREATE OR REPLACE FUNCTION public.trigger_update_cancellations()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sitter_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.status = 'cancelled'
     AND NEW.cancelled_by IS NOT NULL THEN

    -- Owner cancelled their own sit
    IF NEW.cancelled_by = NEW.user_id THEN
      PERFORM recalculate_cancellations(NEW.user_id, 'proprio');
    ELSE
      -- Otherwise, check if canceller is the accepted sitter
      SELECT a.sitter_id INTO v_sitter_id
      FROM applications a
      WHERE a.sit_id = NEW.id AND a.status = 'accepted'
      LIMIT 1;
      IF v_sitter_id IS NOT NULL AND v_sitter_id = NEW.cancelled_by THEN
        PERFORM recalculate_cancellations(v_sitter_id, 'gardien');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;