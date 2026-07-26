-- Trigger : alimente sits.city / sits.country depuis le profil du propriétaire
-- quand le client ne fournit pas de valeur (source de vérité unique côté base).
CREATE OR REPLACE FUNCTION public.fill_sit_location_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_city text;
  p_country text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF (NEW.city IS NULL OR btrim(NEW.city) = '')
     OR (NEW.country IS NULL OR btrim(NEW.country) = '') THEN
    SELECT NULLIF(btrim(city), ''), NULLIF(btrim(country), '')
      INTO p_city, p_country
      FROM public.profiles
     WHERE id = NEW.user_id;

    IF (NEW.city IS NULL OR btrim(NEW.city) = '') AND p_city IS NOT NULL THEN
      NEW.city := p_city;
    END IF;

    IF (NEW.country IS NULL OR btrim(NEW.country) = '') THEN
      NEW.country := COALESCE(p_country, 'FR');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_sit_location ON public.sits;
CREATE TRIGGER trg_fill_sit_location
  BEFORE INSERT OR UPDATE ON public.sits
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_sit_location_from_profile();

-- Rattrapage des annonces existantes.
UPDATE public.sits s
   SET city = COALESCE(NULLIF(btrim(s.city), ''), NULLIF(btrim(p.city), '')),
       country = COALESCE(NULLIF(btrim(s.country), ''), NULLIF(btrim(p.country), ''), 'FR')
  FROM public.profiles p
 WHERE p.id = s.user_id
   AND (s.city IS NULL OR btrim(s.city) = '' OR s.country IS NULL OR btrim(s.country) = '');