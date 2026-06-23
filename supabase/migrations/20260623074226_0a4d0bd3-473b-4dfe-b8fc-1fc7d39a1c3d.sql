-- Slug column
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS sits_slug_unique ON public.sits(slug) WHERE slug IS NOT NULL;

-- Slug generator: lowercase, accents → ASCII (manual map), non-alphanum → '-'
CREATE OR REPLACE FUNCTION public.generate_sit_slug(p_title text, p_city text, p_id uuid)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  base text;
  city_part text;
  suffix text;
  combined text;
BEGIN
  base := lower(coalesce(nullif(trim(p_title), ''), 'annonce'));
  base := translate(base,
    'àáâãäåāăąçćčďđèéêëēĕėęěìíîïīĭįıłñńňòóôõöøōŏőřśšßťţùúûüūŭůűųýÿžźż',
    'aaaaaaaaacccddeeeeeeeeeiiiiiiiilnnnoooooooooorsssttuuuuuuuuuyyzzz');
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '^-+|-+$', '', 'g');
  base := left(base, 60);
  IF base = '' THEN base := 'annonce'; END IF;

  city_part := lower(coalesce(nullif(trim(p_city), ''), ''));
  IF city_part <> '' THEN
    city_part := translate(city_part,
      'àáâãäåāăąçćčďđèéêëēĕėęěìíîïīĭįıłñńňòóôõöøōŏőřśšßťţùúûüūŭŭůűųýÿžźż',
      'aaaaaaaaacccddeeeeeeeeeiiiiiiiilnnnoooooooooorsssttuuuuuuuuuyyzzz');
    city_part := regexp_replace(city_part, '[^a-z0-9]+', '-', 'g');
    city_part := regexp_replace(city_part, '^-+|-+$', '', 'g');
    IF city_part <> '' AND position(city_part in base) = 0 THEN
      base := left(base || '-' || city_part, 80);
    END IF;
  END IF;

  suffix := substr(replace(p_id::text, '-', ''), 1, 6);
  combined := base || '-' || suffix;
  RETURN combined;
END;
$$;

-- Trigger to keep slug fresh
CREATE OR REPLACE FUNCTION public.sits_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_sit_slug(NEW.title, NEW.city, NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.slug IS NULL OR NEW.slug = ''
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.city IS DISTINCT FROM OLD.city THEN
      NEW.slug := public.generate_sit_slug(NEW.title, NEW.city, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sits_set_slug ON public.sits;
CREATE TRIGGER trg_sits_set_slug
BEFORE INSERT OR UPDATE ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.sits_set_slug();

-- Backfill existing rows
UPDATE public.sits SET slug = public.generate_sit_slug(title, city, id) WHERE slug IS NULL;