
CREATE TABLE public.seo_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read seo cache"
  ON public.seo_cache FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage seo cache"
  ON public.seo_cache FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
