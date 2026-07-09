
-- Fonction utilitaire : slugify
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  IF input IS NULL THEN
    RETURN NULL;
  END IF;
  -- Lowercase
  result := lower(input);
  -- Remove accents
  result := translate(
    result,
    'àáâãäåāăąçćčđďèéêëēĕėęěģğıíìîïīĭįķĺļľłńñňņòóôõöøōŏőŕřśšşťţùúûüūŭůűųÿýźžż',
    'aaaaaaaaacccddeeeeeeeeegginiiiiiiiikllllnnnnooooooooorrsssttuuuuuuuuuyyzzz'
  );
  -- Replace non-alphanumeric with hyphens
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- Trim hyphens
  result := trim(both '-' from result);
  -- Limit length
  IF length(result) > 80 THEN
    result := substring(result from 1 for 80);
    result := trim(both '-' from result);
  END IF;
  IF result = '' OR result IS NULL THEN
    result := 'mission';
  END IF;
  RETURN result;
END;
$$;

-- Ajout de la colonne slug
ALTER TABLE public.small_missions
  ADD COLUMN IF NOT EXISTS slug text;

-- Backfill : slug unique basé sur le titre + suffixe id court si collision
DO $$
DECLARE
  rec RECORD;
  base_slug text;
  candidate text;
  suffix_len int;
BEGIN
  FOR rec IN SELECT id, title FROM public.small_missions WHERE slug IS NULL LOOP
    base_slug := public.slugify(rec.title);
    candidate := base_slug;
    suffix_len := 4;
    WHILE EXISTS (SELECT 1 FROM public.small_missions WHERE slug = candidate AND id <> rec.id) LOOP
      candidate := base_slug || '-' || substring(rec.id::text from 1 for suffix_len);
      suffix_len := suffix_len + 1;
    END LOOP;
    UPDATE public.small_missions SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- Contraintes
ALTER TABLE public.small_missions
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS small_missions_slug_key
  ON public.small_missions(slug);

-- Trigger : auto-générer/mettre à jour le slug
CREATE OR REPLACE FUNCTION public.small_missions_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix_len int;
BEGIN
  -- Générer seulement si slug vide, ou si titre a changé sans changement explicite de slug
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title AND NEW.slug = OLD.slug) THEN
    base_slug := public.slugify(NEW.title);
    candidate := base_slug;
    suffix_len := 4;
    WHILE EXISTS (SELECT 1 FROM public.small_missions WHERE slug = candidate AND id <> NEW.id) LOOP
      candidate := base_slug || '-' || substring(NEW.id::text from 1 for suffix_len);
      suffix_len := suffix_len + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS small_missions_set_slug_trigger ON public.small_missions;
CREATE TRIGGER small_missions_set_slug_trigger
  BEFORE INSERT OR UPDATE OF title, slug ON public.small_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.small_missions_set_slug();
