-- Lot LM1 (12/11/2026) : date de dernier changement de contenu des pages ville.
-- Le sitemap donne a Google une date lastmod fiable pour /house-sitting/<ville>.
-- updated_at bouge a chaque recalcul de compteurs (recalc_seo_city_page_counts),
-- il ne dit rien du contenu. content_updated_at avance seulement quand le texte,
-- les metas, l'image, l'adresse, la publication ou l'etat d'indexation changent.
-- Constat du 12/11/2026 (Search Console) : 66 pages ville du sitemap restaient
-- classees « noindex » par Google, relues pour la derniere fois en juillet ou
-- aout, alors qu'elles etaient redevenues indexables. Aucun signal ne lui disait
-- de revenir.
-- Les lignes existantes gardent une date vide : le sitemap omet lastmod tant
-- qu'aucun changement reel n'est constate. Aucune donnee existante modifiee.
-- Repere : lm1_date_contenu_pages_villes.

ALTER TABLE public.seo_city_pages
  ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;

COMMENT ON COLUMN public.seo_city_pages.content_updated_at IS
  'Lot LM1 : dernier changement de contenu ou d''etat d''indexation (lastmod du sitemap). Vide tant qu''aucun changement n''est constate.';

CREATE OR REPLACE FUNCTION public.trg_seo_city_page_content_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
-- lm1_date_contenu_pages_villes
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.content_updated_at := COALESCE(NEW.content_updated_at, now());
  ELSIF NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.h1_title IS DISTINCT FROM OLD.h1_title
     OR NEW.intro_text IS DISTINCT FROM OLD.intro_text
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.excerpt IS DISTINCT FROM OLD.excerpt
     OR NEW.meta_title IS DISTINCT FROM OLD.meta_title
     OR NEW.meta_description IS DISTINCT FROM OLD.meta_description
     OR NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url
     OR NEW.hero_image_alt IS DISTINCT FROM OLD.hero_image_alt
     OR NEW.canonical_url IS DISTINCT FROM OLD.canonical_url
     OR COALESCE(NEW.published, false) <> COALESCE(OLD.published, false)
     OR COALESCE(NEW.noindex, false) <> COALESCE(OLD.noindex, false)
  THEN
    NEW.content_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seo_city_pages_content_date ON public.seo_city_pages;
CREATE TRIGGER seo_city_pages_content_date
  BEFORE INSERT OR UPDATE ON public.seo_city_pages
  FOR EACH ROW EXECUTE FUNCTION public.trg_seo_city_page_content_date();
