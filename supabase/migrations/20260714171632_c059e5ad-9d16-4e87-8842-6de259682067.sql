
-- 1) selected_badges on reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS selected_badges TEXT[] NOT NULL DEFAULT '{}'::text[];

-- 2) idempotence unique index on badge_attributions
CREATE UNIQUE INDEX IF NOT EXISTS uq_badge_attributions_user_giver_sit_badge
  ON public.badge_attributions (user_id, giver_id, sit_id, badge_id);

-- 3) Trigger: on review publication, insert badge_attributions from selected_badges
CREATE OR REPLACE FUNCTION public.attribute_badges_on_review_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published = true
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.published, false) = false)
     AND NEW.selected_badges IS NOT NULL
     AND array_length(NEW.selected_badges, 1) > 0
  THEN
    INSERT INTO public.badge_attributions (badge_id, user_id, giver_id, sit_id, is_manual)
    SELECT b, NEW.reviewee_id, NEW.reviewer_id, NEW.sit_id, false
    FROM unnest(NEW.selected_badges) AS b
    ON CONFLICT (user_id, giver_id, sit_id, badge_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attribute_badges_on_review_publish ON public.reviews;
CREATE TRIGGER trg_attribute_badges_on_review_publish
  AFTER INSERT OR UPDATE OF published ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.attribute_badges_on_review_publish();

-- 4) pg_cron : publish-stale-reviews daily at 05:20 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish_stale_reviews_daily') THEN
    PERFORM cron.unschedule('publish_stale_reviews_daily');
  END IF;
END $$;

SELECT cron.schedule(
  'publish_stale_reviews_daily',
  '20 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/publish-stale-reviews',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzNCwiZXhwIjoyMDg5OTk5MzM0fQ.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY"}'::jsonb,
    body := jsonb_build_object('trigger','cron','time', now())
  ) AS request_id;
  $$
);
