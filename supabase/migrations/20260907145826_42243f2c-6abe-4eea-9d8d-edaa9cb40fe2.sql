-- Recache Prerender des fiches gardien : drapeau + declencheurs.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seo_dirty_at timestamptz;

COMMENT ON COLUMN public.profiles.seo_dirty_at IS
  'Marque une fiche gardien /gardiens/{id} comme a recacher chez Prerender. Pose par trigger sur les champs visibles publiquement, consomme puis efface par la fonction consume-seo-dirty.';

CREATE INDEX IF NOT EXISTS idx_profiles_seo_dirty_at
  ON public.profiles (seo_dirty_at)
  WHERE seo_dirty_at IS NOT NULL;

-- Champs cote profiles qui changent reellement le rendu public.
CREATE OR REPLACE FUNCTION public.mark_profile_seo_dirty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'sitter' AND NEW.role IS DISTINCT FROM 'both' THEN
    RETURN NEW;
  END IF;

  IF NEW.first_name IS DISTINCT FROM OLD.first_name
     OR NEW.city IS DISTINCT FROM OLD.city
     OR NEW.bio IS DISTINCT FROM OLD.bio
     OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
     OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
     OR NEW.postal_code IS DISTINCT FROM OLD.postal_code
  THEN
    -- Deduplication : la premiere modification pose la date, les suivantes ne
    -- la repoussent pas. Une rafale de modifications ne produit qu'un render.
    NEW.seo_dirty_at := COALESCE(OLD.seo_dirty_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_mark_seo_dirty ON public.profiles;
CREATE TRIGGER profiles_mark_seo_dirty
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_profile_seo_dirty();

-- Champs cote sitter_profiles qui changent le rendu public de la meme fiche.
CREATE OR REPLACE FUNCTION public.mark_sitter_profile_seo_dirty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.motivation IS DISTINCT FROM OLD.motivation
     OR NEW.animal_types IS DISTINCT FROM OLD.animal_types
     OR NEW.geographic_radius IS DISTINCT FROM OLD.geographic_radius
  THEN
    UPDATE public.profiles
       SET seo_dirty_at = COALESCE(seo_dirty_at, now())
     WHERE id = NEW.user_id
       AND role IN ('sitter', 'both');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sitter_profiles_mark_seo_dirty ON public.sitter_profiles;
CREATE TRIGGER sitter_profiles_mark_seo_dirty
  AFTER UPDATE ON public.sitter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_sitter_profile_seo_dirty();

-- Rattrapage de la publication du jour : toutes les fiches gardien sont
-- marquees. Le consommateur filtre les non indexables sans depenser de render.
UPDATE public.profiles
   SET seo_dirty_at = COALESCE(seo_dirty_at, now())
 WHERE role IN ('sitter', 'both');