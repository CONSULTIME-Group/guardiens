
-- Add sub-criteria and recommendation to reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS animal_care_rating INTEGER,
  ADD COLUMN IF NOT EXISTS communication_rating INTEGER,
  ADD COLUMN IF NOT EXISTS housing_respect_rating INTEGER,
  ADD COLUMN IF NOT EXISTS reliability_rating INTEGER,
  ADD COLUMN IF NOT EXISTS listing_accuracy_rating INTEGER,
  ADD COLUMN IF NOT EXISTS welcome_rating INTEGER,
  ADD COLUMN IF NOT EXISTS instructions_clarity_rating INTEGER,
  ADD COLUMN IF NOT EXISTS housing_condition_rating INTEGER,
  ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN,
  ADD COLUMN IF NOT EXISTS review_type TEXT DEFAULT 'owner_to_sitter';

-- Function to auto-publish reviews when both parties have submitted
CREATE OR REPLACE FUNCTION public.auto_publish_reviews()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_review_exists BOOLEAN;
  v_sit_id UUID;
BEGIN
  v_sit_id := NEW.sit_id;

  -- Check if the other party has also left a review for this sit
  SELECT EXISTS (
    SELECT 1 FROM public.reviews
    WHERE sit_id = v_sit_id
    AND id != NEW.id
    AND published = false
  ) INTO other_review_exists;

  -- If both reviews exist, publish both
  IF other_review_exists THEN
    UPDATE public.reviews SET published = true WHERE sit_id = v_sit_id AND published = false;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger after insert
CREATE TRIGGER trg_auto_publish_reviews
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_publish_reviews();
