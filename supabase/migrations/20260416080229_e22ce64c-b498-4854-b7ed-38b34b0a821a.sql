-- 1. Drop duplicate triggers (keep only trg_auto_publish_reviews)
DROP TRIGGER IF EXISTS on_auto_publish_reviews ON public.reviews;
DROP TRIGGER IF EXISTS on_review_published ON public.reviews;

-- 2. Fix auto_publish_reviews to also set moderation_status = 'valide'
CREATE OR REPLACE FUNCTION auto_publish_reviews()
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

  -- If both reviews exist, publish both and validate moderation
  IF other_review_exists THEN
    UPDATE public.reviews
    SET published = true, moderation_status = 'valide'
    WHERE sit_id = v_sit_id AND published = false;
  END IF;

  RETURN NEW;
END;
$$;