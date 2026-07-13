
-- 1) owner_highlights: owner can only toggle "hidden"
CREATE OR REPLACE FUNCTION public.owner_highlights_owner_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the updater is the owner (not the sitter themselves)
  IF auth.uid() = OLD.owner_id AND auth.uid() IS DISTINCT FROM OLD.sitter_id THEN
    IF NEW.owner_id     IS DISTINCT FROM OLD.owner_id
    OR NEW.sitter_id    IS DISTINCT FROM OLD.sitter_id
    OR NEW.sit_id       IS DISTINCT FROM OLD.sit_id
    OR NEW.photo_url    IS DISTINCT FROM OLD.photo_url
    OR NEW.text         IS DISTINCT FROM OLD.text
    OR NEW.created_at   IS DISTINCT FROM OLD.created_at
    OR NEW.id           IS DISTINCT FROM OLD.id
    THEN
      RAISE EXCEPTION 'Owners can only toggle the hidden flag on owner_highlights';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_owner_highlights_owner_update_guard ON public.owner_highlights;
CREATE TRIGGER trg_owner_highlights_owner_update_guard
BEFORE UPDATE ON public.owner_highlights
FOR EACH ROW EXECUTE FUNCTION public.owner_highlights_owner_update_guard();

-- Also add a WITH CHECK on the policy so hidden must remain the owner's row
DROP POLICY IF EXISTS "Owners can update highlights (hide)" ON public.owner_highlights;
CREATE POLICY "Owners can update highlights (hide)"
ON public.owner_highlights
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 2) small_mission_responses: mission owner can only change "status"
CREATE OR REPLACE FUNCTION public.small_mission_responses_owner_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  is_mission_owner boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.small_missions m
    WHERE m.id = OLD.mission_id AND m.user_id = auth.uid()
  ) INTO is_mission_owner;

  -- Only enforce when the updater is the mission owner (not the responder)
  IF is_mission_owner AND auth.uid() IS DISTINCT FROM OLD.responder_id THEN
    IF NEW.id               IS DISTINCT FROM OLD.id
    OR NEW.mission_id       IS DISTINCT FROM OLD.mission_id
    OR NEW.responder_id     IS DISTINCT FROM OLD.responder_id
    OR NEW.message          IS DISTINCT FROM OLD.message
    OR NEW.created_at       IS DISTINCT FROM OLD.created_at
    OR NEW.conversation_id  IS DISTINCT FROM OLD.conversation_id
    OR NEW.exchange_offer   IS DISTINCT FROM OLD.exchange_offer
    OR NEW.need_description IS DISTINCT FROM OLD.need_description
    OR NEW.exchange_date    IS DISTINCT FROM OLD.exchange_date
    OR NEW.helpful_count    IS DISTINCT FROM OLD.helpful_count
    THEN
      RAISE EXCEPTION 'Mission owners can only update the status field on small_mission_responses';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_small_mission_responses_owner_update_guard ON public.small_mission_responses;
CREATE TRIGGER trg_small_mission_responses_owner_update_guard
BEFORE UPDATE ON public.small_mission_responses
FOR EACH ROW EXECUTE FUNCTION public.small_mission_responses_owner_update_guard();

DROP POLICY IF EXISTS "Mission owner can update response status" ON public.small_mission_responses;
CREATE POLICY "Mission owner can update response status"
ON public.small_mission_responses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.small_missions m
    WHERE m.id = small_mission_responses.mission_id AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.small_missions m
    WHERE m.id = small_mission_responses.mission_id AND m.user_id = auth.uid()
  )
);
