
-- 1) applications: prevent sitter from self-approving
CREATE OR REPLACE FUNCTION public.enforce_application_status_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.sits s
    WHERE s.id = NEW.sit_id AND s.user_id = auth.uid()
  ) INTO is_owner;
  IF is_owner THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = NEW.sitter_id THEN
    IF NEW.status IN ('cancelled'::application_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Sitters can only withdraw their application (status=cancelled).';
  END IF;
  RAISE EXCEPTION 'Not authorized to change application status.';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_application_status_transitions ON public.applications;
CREATE TRIGGER trg_enforce_application_status_transitions
BEFORE UPDATE OF status ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_application_status_transitions();

-- 2) long_stay_applications: same guard
CREATE OR REPLACE FUNCTION public.enforce_long_stay_app_status_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.long_stays ls
    WHERE ls.id = NEW.long_stay_id AND ls.user_id = auth.uid()
  ) INTO is_owner;
  IF is_owner THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = NEW.sitter_id THEN
    IF NEW.status IN ('cancelled'::application_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Sitters can only withdraw their long stay application (status=cancelled).';
  END IF;
  RAISE EXCEPTION 'Not authorized to change long stay application status.';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_long_stay_app_status_transitions ON public.long_stay_applications;
CREATE TRIGGER trg_enforce_long_stay_app_status_transitions
BEFORE UPDATE OF status ON public.long_stay_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_long_stay_app_status_transitions();

-- 3) small_mission_responses: prevent responder self-approval + restrict public read
CREATE OR REPLACE FUNCTION public.enforce_mission_response_status_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.small_missions m
    WHERE m.id = NEW.mission_id AND m.user_id = auth.uid()
  ) INTO is_owner;
  IF is_owner THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = NEW.responder_id THEN
    IF NEW.status IN ('declined'::small_mission_response_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Responders can only withdraw their response (status=declined).';
  END IF;
  RAISE EXCEPTION 'Not authorized to change mission response status.';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_mission_response_status_transitions ON public.small_mission_responses;
CREATE TRIGGER trg_enforce_mission_response_status_transitions
BEFORE UPDATE OF status ON public.small_mission_responses
FOR EACH ROW EXECUTE FUNCTION public.enforce_mission_response_status_transitions();

-- Restrict public read: only mission owner, responder, or admin
DROP POLICY IF EXISTS "Anyone can read mission responses" ON public.small_mission_responses;
CREATE POLICY "Owner and responder can read mission responses"
ON public.small_mission_responses
FOR SELECT
TO authenticated
USING (
  auth.uid() = responder_id
  OR EXISTS (
    SELECT 1 FROM public.small_missions m
    WHERE m.id = small_mission_responses.mission_id AND m.user_id = auth.uid()
  )
);
