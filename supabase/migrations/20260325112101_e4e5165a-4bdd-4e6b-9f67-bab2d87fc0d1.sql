
CREATE TABLE public.geocode_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  normalized_name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(normalized_name)
);

ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read geocode cache"
  ON public.geocode_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert geocode cache"
  ON public.geocode_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);
