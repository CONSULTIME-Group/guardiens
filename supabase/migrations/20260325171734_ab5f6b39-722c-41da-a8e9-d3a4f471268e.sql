
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_image_url text,
  category text NOT NULL DEFAULT 'conseil',
  tags text[] DEFAULT '{}',
  city text,
  region text,
  author_name text NOT NULL DEFAULT 'Guardiens',
  published boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public read access for published articles (SEO - anon users too)
CREATE POLICY "Published articles are publicly readable"
  ON public.articles FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Only authenticated users can insert/update (future admin)
CREATE POLICY "Authenticated users can insert articles"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update articles"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (true);
