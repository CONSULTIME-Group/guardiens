
-- Add missing columns to articles table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS related_breed text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS related_city text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS meta_description text;

-- Allow authenticated users to delete articles
CREATE POLICY "Authenticated users can delete articles"
ON public.articles FOR DELETE TO authenticated
USING (true);

-- Allow authenticated users to read draft articles (for admin)
DROP POLICY IF EXISTS "Published articles are publicly readable" ON public.articles;
CREATE POLICY "Published articles are publicly readable"
ON public.articles FOR SELECT TO anon
USING (published = true);
CREATE POLICY "Authenticated users can read all articles"
ON public.articles FOR SELECT TO authenticated
USING (true);
