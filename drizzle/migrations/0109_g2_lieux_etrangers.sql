-- Lot G2 « Un lieu étranger n'apparaît jamais en France » (26/10/2026, go de
-- Jérémie le 26/10 : retirer et demander au membre de corriger, jusqu'en
-- production).
--
-- Constat (base, 26/10/2026, comptes actifs) : 26 profils au pays étranger sur
-- 59 avaient un département français tiré du seul code postal (Tübingen 72076
-- dans la Sarthe, Huesca 22005 dans les Côtes-d'Armor, Rio de Janeiro 13000 et
-- Bruxelles 13001 dans les Bouches-du-Rhône), recopié sur leurs annonces ;
-- 9 profils au pays étranger avaient un point en métropole (centre de commune
-- posé par le formulaire avant « Je vis à l'étranger »).
--
-- 1. profiles.place_status (country_mismatch, foreign_city) et place_status_at,
--    écrits par geocode-profile, lus par le bandeau du profil.
-- 2. profile_departement_code(code postal, pays) : département seulement pour
--    le pays France (ou vide) ; pour l'outre-mer, seulement un code 97x ou 98x ;
--    jamais pour un autre pays. Le trigger suit aussi le changement de pays.
-- 3. Reprise : départements recalculés (annonces comprises, par
--    trg_profiles_propagate_dept), puis geocode-profile rappelé pour les pays
--    étrangers dont le point est proche de la métropole (cadre large, la
--    décision vient de la base officielle des communes).
-- Rejouable.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS place_status text,
  ADD COLUMN IF NOT EXISTS place_status_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_place_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_place_status_check
      CHECK (place_status IS NULL OR place_status IN ('country_mismatch', 'foreign_city'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.place_status IS
  'Lot G2 : lieu incohérent écrit par geocode-profile. country_mismatch = pays étranger avec un point en France ; foreign_city = pays France avec une ville étrangère hors des communes du code postal. NULL = rien à signaler.';

CREATE OR REPLACE FUNCTION public.profile_departement_code(p_postal text, p_country text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_country text := upper(coalesce(nullif(trim(p_country), ''), 'FR'));
  v_code text := public.dept_code_from_postal(p_postal);
BEGIN
  IF v_code IS NULL THEN
    RETURN NULL;
  END IF;
  IF v_country IN ('FR', 'FRANCE') THEN
    NULL;
  ELSIF v_country IN ('PF', 'NC', 'RE', 'GP', 'MQ', 'GF', 'YT', 'PM', 'WF', 'BL', 'MF', 'TF') THEN
    IF v_code !~ '^9[78]' THEN
      RETURN NULL;
    END IF;
  ELSE
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.departements d WHERE d.code = v_code) THEN
    RETURN NULL;
  END IF;
  RETURN v_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_profile_departement_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.departement_code := public.profile_departement_code(NEW.postal_code, NEW.country);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profiles_departement_code ON public.profiles;
CREATE TRIGGER trg_profiles_departement_code
  BEFORE INSERT OR UPDATE OF postal_code, country ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_departement_code();

-- 3a. Départements recalculés (le trigger réécrit la valeur, la propagation
-- aux annonces suit).
UPDATE public.profiles
SET country = country
WHERE departement_code IS DISTINCT FROM public.profile_departement_code(postal_code, country);

-- 3b. Pays étranger avec un point proche de la métropole : geocode-profile
-- (déployé avant cette migration) demande à la base officielle des communes si
-- le point est en France ; si oui, point retiré et place_status
-- country_mismatch. Même appel que trg_geocode_profile, avec le secret partagé.
SELECT net.http_post(
  url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/geocode-profile',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-geocode-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'GEOCODE_PROFILE_SECRET' LIMIT 1)
  ),
  body := jsonb_build_object('user_id', p.id)
)
FROM public.profiles p
WHERE upper(coalesce(nullif(trim(p.country), ''), 'FR')) NOT IN
      ('FR', 'FRANCE', 'PF', 'NC', 'RE', 'GP', 'MQ', 'GF', 'YT', 'PM', 'WF', 'BL', 'MF', 'TF')
  AND p.latitude BETWEEN 41.3 AND 51.2
  AND p.longitude BETWEEN -5.3 AND 9.7;
