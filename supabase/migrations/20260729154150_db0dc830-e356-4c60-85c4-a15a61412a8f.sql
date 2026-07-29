-- 1. Fonction de normalisation
CREATE OR REPLACE FUNCTION public.normalize_city_name(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT NULLIF(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(COALESCE($1, ''), '\([^)]*\)', ' ', 'g'),
          '(^\s*\d{5}(?=\s)|(?<=\s)\d{5}\s*$)', ' ', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

COMMENT ON FUNCTION public.normalize_city_name(text) IS
  'Point unique de normalisation des noms de ville (retrait des parentheses, des codes postaux francais isoles, des espaces superflus). Appelee par les triggers de normalisation sur profiles, sits, small_missions, alert_preferences et pro_profiles. Ne jamais dupliquer cette logique ailleurs.';

-- 2. Fonctions trigger specialisees (robustesse : une par forme de table)
CREATE OR REPLACE FUNCTION public.normalize_location_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.city := public.normalize_city_name(NEW.city);
  NEW.country := NULLIF(upper(btrim(NEW.country)), '');
  NEW.postal_code := NULLIF(btrim(NEW.postal_code), '');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_location_fields_city_country()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.city := public.normalize_city_name(NEW.city);
  NEW.country := NULLIF(upper(btrim(NEW.country)), '');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_location_fields_city_postal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.city := public.normalize_city_name(NEW.city);
  NEW.postal_code := NULLIF(btrim(NEW.postal_code), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_location ON public.profiles;
CREATE TRIGGER trg_normalize_location
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_location_fields();

-- sits : nomme trg_normalize_location pour passer APRES trg_fill_sit_location (ordre alphabetique)
DROP TRIGGER IF EXISTS trg_normalize_location ON public.sits;
CREATE TRIGGER trg_normalize_location
BEFORE INSERT OR UPDATE ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.normalize_location_fields_city_country();

DROP TRIGGER IF EXISTS trg_normalize_location ON public.small_missions;
CREATE TRIGGER trg_normalize_location
BEFORE INSERT OR UPDATE ON public.small_missions
FOR EACH ROW EXECUTE FUNCTION public.normalize_location_fields_city_postal();

DROP TRIGGER IF EXISTS trg_normalize_location ON public.alert_preferences;
CREATE TRIGGER trg_normalize_location
BEFORE INSERT OR UPDATE ON public.alert_preferences
FOR EACH ROW EXECUTE FUNCTION public.normalize_location_fields_city_postal();

DROP TRIGGER IF EXISTS trg_normalize_location ON public.pro_profiles;
CREATE TRIGGER trg_normalize_location
BEFORE INSERT OR UPDATE ON public.pro_profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_location_fields_city_postal();

-- 4. Nettoyage des donnees residuelles
UPDATE public.profiles SET city = public.normalize_city_name(city)
  WHERE city IS DISTINCT FROM public.normalize_city_name(city);
UPDATE public.sits SET city = public.normalize_city_name(city)
  WHERE city IS DISTINCT FROM public.normalize_city_name(city);
UPDATE public.small_missions SET city = public.normalize_city_name(city)
  WHERE city IS DISTINCT FROM public.normalize_city_name(city);
UPDATE public.alert_preferences SET city = public.normalize_city_name(city)
  WHERE city IS DISTINCT FROM public.normalize_city_name(city);
UPDATE public.pro_profiles SET city = public.normalize_city_name(city)
  WHERE city IS DISTINCT FROM public.normalize_city_name(city);

UPDATE public.profiles SET postal_code = NULL
  WHERE postal_code IS NOT NULL AND btrim(postal_code) !~ '^[0-9]{5}$';

-- 3. Contrainte de format sur le pays (apres nettoyage)
UPDATE public.sits SET country = 'MA'
  WHERE id = '79a8274e-477e-4146-b8e2-0c1a2a20f055' AND upper(btrim(country)) = 'MAROC';
UPDATE public.sits SET country = NULL
  WHERE country IS NOT NULL AND upper(btrim(country)) !~ '^[A-Z]{2}$';
UPDATE public.profiles SET country = NULL
  WHERE country IS NOT NULL AND upper(btrim(country)) !~ '^[A-Z]{2}$';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_country_iso2_chk CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');
ALTER TABLE public.sits
  ADD CONSTRAINT sits_country_iso2_chk CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');