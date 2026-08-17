CREATE TABLE public.article_translations_archive_de_it (
  id uuid PRIMARY KEY,
  article_id uuid NOT NULL,
  lang text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  meta_title text,
  meta_description text,
  hero_image_alt text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  noindex boolean NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.article_translations_archive_de_it TO service_role;
ALTER TABLE public.article_translations_archive_de_it ENABLE ROW LEVEL SECURITY;

INSERT INTO public.article_translations_archive_de_it (id, article_id, lang, title, slug, excerpt, content, meta_title, meta_description, hero_image_alt, created_at, updated_at, noindex)
SELECT id, article_id, lang, title, slug, excerpt, content, meta_title, meta_description, hero_image_alt, created_at, updated_at, noindex
FROM public.article_translations
WHERE lang IN ('de', 'it');

DO $$
DECLARE
  src_count int;
  arch_count int;
BEGIN
  SELECT COUNT(*) INTO src_count FROM public.article_translations WHERE lang IN ('de','it');
  SELECT COUNT(*) INTO arch_count FROM public.article_translations_archive_de_it;
  IF src_count IS DISTINCT FROM arch_count THEN
    RAISE EXCEPTION 'Archive incoherente: % lignes source vs % lignes archivees, suppression annulee', src_count, arch_count;
  END IF;
END $$;

DELETE FROM public.article_translations WHERE lang IN ('de', 'it');