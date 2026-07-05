
-- Enums
DO $$ BEGIN
  CREATE TYPE public.analysis_request_type AS ENUM ('city','breed','places','pros','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.analysis_request_status AS ENUM ('new','in_progress','done','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE public.analysis_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type public.analysis_request_type NOT NULL,
  subject text NOT NULL,
  details text,
  email text,
  ip_hash text,
  city_context text,
  status public.analysis_request_status NOT NULL DEFAULT 'new',
  admin_notes text,
  delivered_at timestamptz,
  delivered_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_requests TO authenticated;
GRANT ALL ON public.analysis_requests TO service_role;

ALTER TABLE public.analysis_requests ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins manage analysis_requests"
  ON public.analysis_requests
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Service role bypasses RLS by default; no anon/authenticated INSERT policy (edge function uses service role).

CREATE TRIGGER trg_analysis_requests_updated_at
  BEFORE UPDATE ON public.analysis_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_analysis_requests_status_created ON public.analysis_requests (status, created_at DESC);
CREATE INDEX idx_analysis_requests_type ON public.analysis_requests (request_type);
CREATE INDEX idx_analysis_requests_ip_created ON public.analysis_requests (ip_hash, created_at DESC);

-- RPC: aggregated public counts
CREATE OR REPLACE FUNCTION public.get_inventaire_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'cities_total', (SELECT count(*) FROM public.city_guides WHERE published = true),
    'places_total', (SELECT count(*) FROM public.city_guide_places p JOIN public.city_guides g ON g.id = p.city_guide_id WHERE g.published = true),
    'places_by_category', (
      SELECT COALESCE(jsonb_object_agg(category, cnt), '{}'::jsonb)
      FROM (
        SELECT p.category::text AS category, count(*) AS cnt
        FROM public.city_guide_places p
        JOIN public.city_guides g ON g.id = p.city_guide_id
        WHERE g.published = true
        GROUP BY p.category
      ) x
    ),
    'breeds_total', (SELECT count(*) FROM public.breed_profiles),
    'breeds_by_species', (
      SELECT COALESCE(jsonb_object_agg(species, cnt), '{}'::jsonb)
      FROM (SELECT species, count(*) AS cnt FROM public.breed_profiles GROUP BY species) x
    ),
    'pros_total', (SELECT count(*) FROM public.pro_profiles),
    'pros_by_category', (
      SELECT COALESCE(jsonb_object_agg(category, cnt), '{}'::jsonb)
      FROM (SELECT category::text AS category, count(*) AS cnt FROM public.pro_profiles GROUP BY category) x
    ),
    'generated_at', now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_inventaire_counts() TO anon, authenticated;
