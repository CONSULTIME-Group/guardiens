-- Lot L1 : une annonce publiée dit toujours où elle est.
-- Contrôle au PASSAGE en publication seulement (insertion publiée, ou statut
-- qui devient published/confirmed) : aucune annonce déjà publiée n'est
-- dépubliée ni bloquée dans ses mises à jour. La ville du profil est reprise
-- avant par trg_fill_sit_location (ordre alphabétique des déclencheurs).
CREATE OR REPLACE FUNCTION public.guard_sit_publish_requires_city()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('published'::sit_status, 'confirmed'::sit_status)
     AND (TG_OP = 'INSERT' OR OLD.status IS NULL
          OR OLD.status NOT IN ('published'::sit_status, 'confirmed'::sit_status))
     AND btrim(COALESCE(NEW.city, '')) = '' THEN
    RAISE EXCEPTION 'Indiquez la commune de votre logement pour que les gardiens sachent où se trouve la garde.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_sit_city ON public.sits;
CREATE TRIGGER trg_guard_sit_city
  BEFORE INSERT OR UPDATE OF status, city ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.guard_sit_publish_requires_city();