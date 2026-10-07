-- Lot L2 : une photo du logement se gère à un seul endroit, la Galerie
-- (owner_gallery). properties.photos et properties.cover_photo_url ne
-- reçoivent que des URL présentes dans la galerie du propriétaire ; une
-- suppression dans la galerie retire la photo du logement et remplace les
-- couvertures (logement et annonces, tous statuts) par la photo suivante.
-- sits.cover_photo_url n'est pas gardée : une annonce peut avoir pour
-- couverture la photo d'un animal (dossier pets/).

CREATE TABLE IF NOT EXISTS public._backup_l2_photos_20261007 (
  property_id uuid NOT NULL,
  user_id uuid NOT NULL,
  photos text[],
  cover_photo_url text,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public._backup_l2_photos_20261007 TO service_role;
ALTER TABLE public._backup_l2_photos_20261007 ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS owner_gallery_user_photo_url_key
  ON public.owner_gallery (user_id, photo_url);

CREATE OR REPLACE FUNCTION public.owner_gallery_next_cover(p_user uuid, p_position integer, p_created timestamptz)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT g.photo_url
  FROM public.owner_gallery g
  WHERE g.user_id = p_user
  ORDER BY (g.position > p_position OR (g.position = p_position AND g.created_at > p_created)) DESC,
           g.position, g.created_at
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.guard_property_photos_in_gallery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_old text[] := '{}'::text[];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old := COALESCE(OLD.photos, '{}'::text[]) || COALESCE(OLD.cover_photo_url, '');
  END IF;
  FOR v_url IN
    SELECT DISTINCT u FROM unnest(COALESCE(NEW.photos, '{}'::text[]) || NEW.cover_photo_url) AS u
    WHERE u IS NOT NULL AND btrim(u) <> ''
  LOOP
    IF v_url = ANY(v_old) THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.owner_gallery g WHERE g.user_id = NEW.user_id AND g.photo_url = v_url
    ) THEN
      RAISE EXCEPTION 'Cette photo doit d''abord être ajoutée à la Galerie de votre profil propriétaire.'
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_property_photos_in_gallery ON public.properties;
CREATE TRIGGER trg_guard_property_photos_in_gallery
  BEFORE INSERT OR UPDATE OF photos, cover_photo_url ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.guard_property_photos_in_gallery();

CREATE OR REPLACE FUNCTION public.sync_owner_gallery_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.owner_gallery g WHERE g.user_id = OLD.user_id AND g.photo_url = OLD.photo_url
  ) THEN
    RETURN OLD;
  END IF;
  v_next := public.owner_gallery_next_cover(OLD.user_id, OLD.position, OLD.created_at);
  UPDATE public.properties
     SET photos = array_remove(COALESCE(photos, '{}'::text[]), OLD.photo_url)
   WHERE user_id = OLD.user_id AND OLD.photo_url = ANY(COALESCE(photos, '{}'::text[]));
  UPDATE public.properties
     SET cover_photo_url = v_next
   WHERE user_id = OLD.user_id AND cover_photo_url = OLD.photo_url;
  UPDATE public.sits
     SET cover_photo_url = v_next
   WHERE user_id = OLD.user_id AND cover_photo_url = OLD.photo_url;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_owner_gallery_delete ON public.owner_gallery;
CREATE TRIGGER trg_sync_owner_gallery_delete
  AFTER DELETE ON public.owner_gallery
  FOR EACH ROW EXECUTE FUNCTION public.sync_owner_gallery_delete();

-- Le fichier n'est supprimé du stockage que si plus rien ne le référence.
-- Réponse limitée au dossier du membre connecté : pour toute autre URL, la
-- fonction répond « référencée », ce qui interdit la suppression.
CREATE OR REPLACE FUNCTION public.owner_photo_still_referenced(p_url text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR position(('/property-photos/' || auth.uid()::text || '/') IN COALESCE(p_url, '')) = 0 THEN
    RETURN true;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.owner_gallery WHERE photo_url = p_url)
      OR EXISTS (SELECT 1 FROM public.properties WHERE cover_photo_url = p_url OR p_url = ANY(COALESCE(photos, '{}'::text[])))
      OR EXISTS (SELECT 1 FROM public.sits WHERE cover_photo_url = p_url)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE avatar_url = p_url)
      OR EXISTS (SELECT 1 FROM public.pets WHERE photo_url = p_url);
END;
$$;

REVOKE ALL ON FUNCTION public.owner_photo_still_referenced(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_photo_still_referenced(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_owner_gallery_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_property_photos_in_gallery() FROM PUBLIC, anon, authenticated;