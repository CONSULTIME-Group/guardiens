
-- Create seo_city_pages table
CREATE TABLE public.seo_city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  department text NOT NULL,
  slug text NOT NULL UNIQUE,
  h1_title text NOT NULL DEFAULT '',
  intro_text text NOT NULL DEFAULT '',
  sitter_count integer NOT NULL DEFAULT 0,
  active_sits_count integer NOT NULL DEFAULT 0,
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_city_pages ENABLE ROW LEVEL SECURITY;

-- Public read access for published pages (anon + authenticated)
CREATE POLICY "Published city pages are publicly readable"
  ON public.seo_city_pages FOR SELECT TO anon
  USING (published = true);

CREATE POLICY "Authenticated can read all city pages"
  ON public.seo_city_pages FOR SELECT TO authenticated
  USING (true);

-- Admin management via has_role
CREATE POLICY "Admins can insert city pages"
  ON public.seo_city_pages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update city pages"
  ON public.seo_city_pages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete city pages"
  ON public.seo_city_pages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
