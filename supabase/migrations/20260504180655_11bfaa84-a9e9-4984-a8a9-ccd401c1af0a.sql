-- Auto-invalidate Prerender.io cache when SEO-critical fields change
-- on articles, seo_city_pages, city_guides.

CREATE OR REPLACE FUNCTION public.trg_recache_prerender()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_endpoint text := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/prerender-recache';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY';
  v_changed boolean := false;
BEGIN
  -- Detect change on tracked SEO fields
  IF TG_TABLE_NAME = 'articles' THEN
    IF (NEW.canonical_url IS DISTINCT FROM OLD.canonical_url)
       OR (NEW.noindex IS DISTINCT FROM OLD.noindex)
       OR (NEW.meta_title IS DISTINCT FROM OLD.meta_title)
       OR (NEW.meta_description IS DISTINCT FROM OLD.meta_description) THEN
      v_changed := true;
      v_url := 'https://guardiens.fr/actualites/' || NEW.slug;
    END IF;

  ELSIF TG_TABLE_NAME = 'seo_city_pages' THEN
    IF (NEW.canonical_url IS DISTINCT FROM OLD.canonical_url)
       OR (NEW.noindex IS DISTINCT FROM OLD.noindex)
       OR (NEW.meta_title IS DISTINCT FROM OLD.meta_title)
       OR (NEW.meta_description IS DISTINCT FROM OLD.meta_description) THEN
      v_changed := true;
      v_url := 'https://guardiens.fr/house-sitting/' || NEW.slug;
    END IF;

  ELSIF TG_TABLE_NAME = 'city_guides' THEN
    -- city_guides has no canonical_url/noindex/meta_* columns today;
    -- recache on any update of slug or republish toggle.
    IF (NEW.slug IS DISTINCT FROM OLD.slug)
       OR (NEW.published IS DISTINCT FROM OLD.published) THEN
      v_changed := true;
      v_url := 'https://guardiens.fr/guides/' || NEW.slug;
    END IF;
  END IF;

  IF NOT v_changed OR v_url IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon
    ),
    body := jsonb_build_object('urls', jsonb_build_array(v_url))
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'prerender-recache HTTP call failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop & re-create triggers idempotently
DROP TRIGGER IF EXISTS articles_recache_prerender ON public.articles;
CREATE TRIGGER articles_recache_prerender
AFTER UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.trg_recache_prerender();

DROP TRIGGER IF EXISTS seo_city_pages_recache_prerender ON public.seo_city_pages;
CREATE TRIGGER seo_city_pages_recache_prerender
AFTER UPDATE ON public.seo_city_pages
FOR EACH ROW EXECUTE FUNCTION public.trg_recache_prerender();

DROP TRIGGER IF EXISTS city_guides_recache_prerender ON public.city_guides;
CREATE TRIGGER city_guides_recache_prerender
AFTER UPDATE ON public.city_guides
FOR EACH ROW EXECUTE FUNCTION public.trg_recache_prerender();
