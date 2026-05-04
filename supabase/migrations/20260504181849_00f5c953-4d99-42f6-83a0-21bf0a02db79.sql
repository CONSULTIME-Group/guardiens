-- 1. Add dirty marker columns
ALTER TABLE public.articles       ADD COLUMN IF NOT EXISTS seo_dirty_at timestamptz;
ALTER TABLE public.seo_city_pages ADD COLUMN IF NOT EXISTS seo_dirty_at timestamptz;
ALTER TABLE public.city_guides    ADD COLUMN IF NOT EXISTS seo_dirty_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_articles_seo_dirty       ON public.articles       (seo_dirty_at) WHERE seo_dirty_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seo_city_pages_seo_dirty ON public.seo_city_pages (seo_dirty_at) WHERE seo_dirty_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_city_guides_seo_dirty    ON public.city_guides    (seo_dirty_at) WHERE seo_dirty_at IS NOT NULL;

-- 2. Replace trigger function: mark dirty instead of HTTP-posting
CREATE OR REPLACE FUNCTION public.trg_recache_prerender()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'articles' THEN
    IF (NEW.canonical_url    IS DISTINCT FROM OLD.canonical_url)
    OR (NEW.noindex          IS DISTINCT FROM OLD.noindex)
    OR (NEW.meta_title       IS DISTINCT FROM OLD.meta_title)
    OR (NEW.meta_description IS DISTINCT FROM OLD.meta_description) THEN
      v_changed := true;
    END IF;

  ELSIF TG_TABLE_NAME = 'seo_city_pages' THEN
    IF (NEW.canonical_url    IS DISTINCT FROM OLD.canonical_url)
    OR (NEW.noindex          IS DISTINCT FROM OLD.noindex)
    OR (NEW.meta_title       IS DISTINCT FROM OLD.meta_title)
    OR (NEW.meta_description IS DISTINCT FROM OLD.meta_description) THEN
      v_changed := true;
    END IF;

  ELSIF TG_TABLE_NAME = 'city_guides' THEN
    IF (NEW.slug      IS DISTINCT FROM OLD.slug)
    OR (NEW.published IS DISTINCT FROM OLD.published) THEN
      v_changed := true;
    END IF;
  END IF;

  IF v_changed THEN
    NEW.seo_dirty_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Re-bind triggers as BEFORE UPDATE so we can mutate NEW.seo_dirty_at
DROP TRIGGER IF EXISTS articles_recache_prerender       ON public.articles;
DROP TRIGGER IF EXISTS seo_city_pages_recache_prerender ON public.seo_city_pages;
DROP TRIGGER IF EXISTS city_guides_recache_prerender    ON public.city_guides;

CREATE TRIGGER articles_recache_prerender
BEFORE UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.trg_recache_prerender();

CREATE TRIGGER seo_city_pages_recache_prerender
BEFORE UPDATE ON public.seo_city_pages
FOR EACH ROW EXECUTE FUNCTION public.trg_recache_prerender();

CREATE TRIGGER city_guides_recache_prerender
BEFORE UPDATE ON public.city_guides
FOR EACH ROW EXECUTE FUNCTION public.trg_recache_prerender();

-- 4. Backfill: mark all rows already touched today as dirty so the next
-- publish flushes them (covers the in-flight changes that lost their HTTP call).
UPDATE public.articles       SET seo_dirty_at = now() WHERE seo_dirty_at IS NULL AND (canonical_url IS NOT NULL OR noindex = true);
UPDATE public.seo_city_pages SET seo_dirty_at = now() WHERE seo_dirty_at IS NULL AND (canonical_url IS NOT NULL OR noindex = true);