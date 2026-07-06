
-- 1) messages: sender-only update
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
CREATE POLICY "Sender can update own messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Allow participants (non-sender) to only mark read_at via a dedicated policy limited by trigger
CREATE OR REPLACE FUNCTION public.messages_guard_participant_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If caller is not the sender, only read_at may change
  IF auth.uid() IS DISTINCT FROM OLD.sender_id THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Only the sender can modify message content';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_guard_participant_update ON public.messages;
CREATE TRIGGER trg_messages_guard_participant_update
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_guard_participant_update();

-- Restore participant update policy (for read_at updates), but guarded by trigger
CREATE POLICY "Participants can update read_at"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.owner_id = auth.uid() OR c.sitter_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.owner_id = auth.uid() OR c.sitter_id = auth.uid())
  )
);


-- 2) applications: prevent sitter from changing status
CREATE OR REPLACE FUNCTION public.applications_guard_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT s.user_id INTO v_owner FROM public.sits s WHERE s.id = OLD.sit_id;
    IF auth.uid() IS DISTINCT FROM v_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only the sit owner can change application status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applications_guard_status_update ON public.applications;
CREATE TRIGGER trg_applications_guard_status_update
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.applications_guard_status_update();


-- 3) reviews: prevent reviewer from self-moderating / self-publishing
CREATE OR REPLACE FUNCTION public.reviews_guard_moderation_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
       OR NEW.published IS DISTINCT FROM OLD.published
       OR NEW.response_status IS DISTINCT FROM OLD.response_status THEN
      RAISE EXCEPTION 'Only admins can change moderation_status, published or response_status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_guard_moderation_update ON public.reviews;
CREATE TRIGGER trg_reviews_guard_moderation_update
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_guard_moderation_update();


-- 4) small_mission_responses: prevent responder from changing status
CREATE OR REPLACE FUNCTION public.small_mission_responses_guard_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT m.user_id INTO v_owner FROM public.small_missions m WHERE m.id = OLD.mission_id;
    IF auth.uid() IS DISTINCT FROM v_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      -- Allow responder to withdraw (set to 'withdrawn') their own pending response
      IF NOT (auth.uid() = OLD.responder_id AND NEW.status = 'withdrawn' AND OLD.status = 'pending') THEN
        RAISE EXCEPTION 'Only the mission owner can change response status';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_small_mission_responses_guard_status ON public.small_mission_responses;
CREATE TRIGGER trg_small_mission_responses_guard_status
BEFORE UPDATE ON public.small_mission_responses
FOR EACH ROW EXECUTE FUNCTION public.small_mission_responses_guard_status();


-- 5) community_questions: coarsen public coordinates to ~11 km grid (1 decimal)
CREATE OR REPLACE FUNCTION public.community_questions_coarsen_coords()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL THEN
    NEW.latitude := round(NEW.latitude::numeric, 1)::double precision;
  END IF;
  IF NEW.longitude IS NOT NULL THEN
    NEW.longitude := round(NEW.longitude::numeric, 1)::double precision;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_questions_coarsen_coords ON public.community_questions;
CREATE TRIGGER trg_community_questions_coarsen_coords
BEFORE INSERT OR UPDATE ON public.community_questions
FOR EACH ROW EXECUTE FUNCTION public.community_questions_coarsen_coords();

-- Coarsen existing rows
UPDATE public.community_questions
SET latitude = round(latitude::numeric, 1)::double precision
WHERE latitude IS NOT NULL
  AND latitude <> round(latitude::numeric, 1)::double precision;

UPDATE public.community_questions
SET longitude = round(longitude::numeric, 1)::double precision
WHERE longitude IS NOT NULL
  AND longitude <> round(longitude::numeric, 1)::double precision;
