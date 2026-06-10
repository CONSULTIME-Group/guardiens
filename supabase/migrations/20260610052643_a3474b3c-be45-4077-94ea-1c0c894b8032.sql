
CREATE TABLE public.article_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  lang text NOT NULL CHECK (lang IN ('en','es','it','de')),
  title text NOT NULL DEFAULT '',
  slug text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  meta_title text,
  meta_description text,
  hero_image_alt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, lang),
  UNIQUE (lang, slug)
);

GRANT SELECT ON public.article_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.article_translations TO authenticated;
GRANT ALL ON public.article_translations TO service_role;

ALTER TABLE public.article_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_translations_public_read"
ON public.article_translations FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.published = true)
);

CREATE POLICY "article_translations_admin_all"
ON public.article_translations FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE INDEX idx_article_translations_lookup ON public.article_translations(lang, slug);
CREATE INDEX idx_article_translations_article ON public.article_translations(article_id);

CREATE TRIGGER update_article_translations_updated_at
BEFORE UPDATE ON public.article_translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
