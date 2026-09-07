-- 1. Table des empreintes de deploiement
CREATE TABLE IF NOT EXISTS public.deploy_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL UNIQUE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  seen_count integer NOT NULL DEFAULT 1,
  marked_at timestamptz,
  marked_rows integer
);

GRANT ALL ON public.deploy_fingerprints TO service_role;

ALTER TABLE public.deploy_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read deploy fingerprints"
ON public.deploy_fingerprints
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.deploy_fingerprints TO authenticated;

-- 2. Deduplication du marquage, et branche departements
CREATE OR REPLACE FUNCTION public.trg_recache_prerender()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE v_changed boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'articles' THEN
    IF (NEW.canonical_url IS DISTINCT FROM OLD.canonical_url)
    OR (NEW.noindex IS DISTINCT FROM OLD.noindex)
    OR (NEW.meta_title IS DISTINCT FROM OLD.meta_title)
    OR (NEW.meta_description IS DISTINCT FROM OLD.meta_description)
    OR (NEW.content IS DISTINCT FROM OLD.content)
    OR (NEW.title IS DISTINCT FROM OLD.title)
    OR (NEW.excerpt IS DISTINCT FROM OLD.excerpt) THEN
      v_changed := true;
    END IF;
  ELSIF TG_TABLE_NAME = 'seo_city_pages' THEN
    IF (NEW.canonical_url IS DISTINCT FROM OLD.canonical_url)
    OR (NEW.noindex IS DISTINCT FROM OLD.noindex)
    OR (NEW.meta_title IS DISTINCT FROM OLD.meta_title)
    OR (NEW.meta_description IS DISTINCT FROM OLD.meta_description)
    OR (NEW.content IS DISTINCT FROM OLD.content)
    OR (NEW.h1_title IS DISTINCT FROM OLD.h1_title)
    OR (NEW.intro_text IS DISTINCT FROM OLD.intro_text)
    OR (NEW.excerpt IS DISTINCT FROM OLD.excerpt) THEN
      v_changed := true;
    END IF;
  ELSIF TG_TABLE_NAME = 'seo_department_pages' THEN
    IF (NEW.noindex IS DISTINCT FROM OLD.noindex)
    OR (NEW.meta_title IS DISTINCT FROM OLD.meta_title)
    OR (NEW.meta_description IS DISTINCT FROM OLD.meta_description)
    OR (NEW.h1_title IS DISTINCT FROM OLD.h1_title)
    OR (NEW.intro_text IS DISTINCT FROM OLD.intro_text)
    OR (NEW.highlights IS DISTINCT FROM OLD.highlights)
    OR (NEW.published IS DISTINCT FROM OLD.published)
    OR (NEW.slug IS DISTINCT FROM OLD.slug) THEN
      v_changed := true;
    END IF;
  ELSIF TG_TABLE_NAME = 'city_guides' THEN
    IF (NEW.slug IS DISTINCT FROM OLD.slug)
    OR (NEW.published IS DISTINCT FROM OLD.published)
    OR (NEW.intro IS DISTINCT FROM OLD.intro)
    OR (NEW.ideal_for IS DISTINCT FROM OLD.ideal_for) THEN
      v_changed := true;
    END IF;
  END IF;
  -- Deduplication : ne jamais repousser une date deja posee, une rafale de
  -- mises a jour ne produit qu'un seul render.
  IF v_changed THEN NEW.seo_dirty_at := COALESCE(OLD.seo_dirty_at, now()); END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS seo_department_pages_recache_prerender ON public.seo_department_pages;
CREATE TRIGGER seo_department_pages_recache_prerender
BEFORE UPDATE ON public.seo_department_pages
FOR EACH ROW EXECUTE FUNCTION public.trg_recache_prerender();

CREATE INDEX IF NOT EXISTS idx_seo_department_pages_seo_dirty_at
  ON public.seo_department_pages (seo_dirty_at) WHERE seo_dirty_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seo_city_pages_seo_dirty_at
  ON public.seo_city_pages (seo_dirty_at) WHERE seo_dirty_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_city_guides_seo_dirty_at
  ON public.city_guides (seo_dirty_at) WHERE seo_dirty_at IS NOT NULL;