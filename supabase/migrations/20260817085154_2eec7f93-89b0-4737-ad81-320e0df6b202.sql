DROP TRIGGER IF EXISTS update_article_translations_updated_at ON public.article_translations;
DROP POLICY IF EXISTS article_translations_admin_all ON public.article_translations;
DROP POLICY IF EXISTS article_translations_public_read ON public.article_translations;
DROP TABLE public.article_translations;