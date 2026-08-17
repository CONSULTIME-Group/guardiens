ALTER TABLE public.article_translations_archive_de_it RENAME TO article_translations_archive;

INSERT INTO public.article_translations_archive (id, article_id, lang, title, slug, excerpt, content, meta_title, meta_description, hero_image_alt, created_at, updated_at, noindex)
SELECT id, article_id, lang, title, slug, excerpt, content, meta_title, meta_description, hero_image_alt, created_at, updated_at, noindex
FROM public.article_translations
WHERE lang = 'es';

DO $$
DECLARE
  src_count int;
  arch_count int;
BEGIN
  SELECT COUNT(*) INTO src_count FROM public.article_translations WHERE lang = 'es';
  SELECT COUNT(*) INTO arch_count FROM public.article_translations_archive WHERE lang = 'es';
  IF src_count IS DISTINCT FROM arch_count THEN
    RAISE EXCEPTION 'Archive incoherente: % lignes source es vs % lignes archivees, suppression annulee', src_count, arch_count;
  END IF;
END $$;

DELETE FROM public.article_translations WHERE lang = 'es';