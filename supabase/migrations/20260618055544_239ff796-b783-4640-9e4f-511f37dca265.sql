-- 1. Ajout google_place_id sur pro_profiles
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS google_place_id text;

-- 2. Cache des avis Google (TTL 24h)
CREATE TABLE IF NOT EXISTS public.pro_google_reviews_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  reviews jsonb NOT NULL DEFAULT '[]'::jsonb,
  rating_avg numeric(3,2),
  rating_count integer DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pro_id)
);

GRANT SELECT ON public.pro_google_reviews_cache TO anon;
GRANT SELECT ON public.pro_google_reviews_cache TO authenticated;
GRANT ALL ON public.pro_google_reviews_cache TO service_role;

ALTER TABLE public.pro_google_reviews_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read google reviews cache"
  ON public.pro_google_reviews_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages google reviews cache"
  ON public.pro_google_reviews_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pro_google_reviews_cache_pro_id
  ON public.pro_google_reviews_cache (pro_id);

CREATE INDEX IF NOT EXISTS idx_pro_google_reviews_cache_fetched_at
  ON public.pro_google_reviews_cache (fetched_at);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_pro_google_reviews_cache_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pro_google_reviews_cache_updated_at
  ON public.pro_google_reviews_cache;

CREATE TRIGGER trg_pro_google_reviews_cache_updated_at
  BEFORE UPDATE ON public.pro_google_reviews_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pro_google_reviews_cache_updated_at();