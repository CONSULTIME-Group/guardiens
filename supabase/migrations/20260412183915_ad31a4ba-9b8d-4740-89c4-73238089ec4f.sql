-- Validation trigger for small_missions
CREATE OR REPLACE FUNCTION public.validate_small_mission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate duration_estimate
  IF NEW.duration_estimate IS NOT NULL AND NEW.duration_estimate NOT IN ('1-2h', 'half_day', 'several', 'weekend') THEN
    RAISE EXCEPTION 'Invalid duration_estimate: %. Allowed values: 1-2h, half_day, several, weekend', NEW.duration_estimate;
  END IF;

  -- On INSERT, validate date_needed is not in the past
  IF TG_OP = 'INSERT' AND NEW.date_needed IS NOT NULL AND NEW.date_needed < CURRENT_DATE THEN
    RAISE EXCEPTION 'date_needed cannot be in the past';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_validate_small_mission ON public.small_missions;
CREATE TRIGGER trg_validate_small_mission
  BEFORE INSERT OR UPDATE ON public.small_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_small_mission();