
-- 1) conversations : WITH CHECK + trigger immuabilité owner_id/sitter_id
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
USING ((auth.uid() = owner_id) OR (auth.uid() = sitter_id))
WITH CHECK ((auth.uid() = owner_id) OR (auth.uid() = sitter_id));

CREATE OR REPLACE FUNCTION public.enforce_conversations_immutable_parties()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.sitter_id IS DISTINCT FROM OLD.sitter_id THEN
    RAISE EXCEPTION 'owner_id/sitter_id are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_immutable_parties ON public.conversations;
CREATE TRIGGER trg_conversations_immutable_parties
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.enforce_conversations_immutable_parties();

-- 2) messages : trigger immuabilité sender_id / conversation_id (la policy a déjà un WITH CHECK)
CREATE OR REPLACE FUNCTION public.enforce_messages_immutable_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'sender_id/conversation_id are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_immutable_identity ON public.messages;
CREATE TRIGGER trg_messages_immutable_identity
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_messages_immutable_identity();

-- 3) sits : WITH CHECK + trigger immuabilité user_id
DROP POLICY IF EXISTS "Owners can update their own sits" ON public.sits;
CREATE POLICY "Owners can update their own sits"
ON public.sits
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_sits_immutable_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'sits.user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sits_immutable_owner ON public.sits;
CREATE TRIGGER trg_sits_immutable_owner
BEFORE UPDATE ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.enforce_sits_immutable_owner();

-- 4) properties : WITH CHECK + trigger immuabilité user_id
DROP POLICY IF EXISTS "Owners can update their own properties" ON public.properties;
CREATE POLICY "Owners can update their own properties"
ON public.properties
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_properties_immutable_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'properties.user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_immutable_owner ON public.properties;
CREATE TRIGGER trg_properties_immutable_owner
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.enforce_properties_immutable_owner();

-- 5) reviews : WITH CHECK + trigger immuabilité identités + verrouillage après publication/modération
DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON public.reviews;
CREATE POLICY "Reviewers can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = reviewer_id);

CREATE OR REPLACE FUNCTION public.enforce_reviews_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Identités immuables côté auteur.
  IF NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     OR NEW.reviewee_id IS DISTINCT FROM OLD.reviewee_id THEN
    RAISE EXCEPTION 'reviewer_id/reviewee_id are immutable';
  END IF;

  -- L'auteur ne peut plus altérer notes / commentaire / statut de modération
  -- une fois l'avis publié ou modéré.
  IF COALESCE(OLD.is_published, false) = true
     OR COALESCE(OLD.moderation_status, 'pending') <> 'pending' THEN
    IF NEW.overall_rating       IS DISTINCT FROM OLD.overall_rating
       OR NEW.comment           IS DISTINCT FROM OLD.comment
       OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
       OR NEW.is_published      IS DISTINCT FROM OLD.is_published THEN
      RAISE EXCEPTION 'review is locked once published or moderated';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_integrity ON public.reviews;
CREATE TRIGGER trg_reviews_integrity
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_reviews_integrity();
