-- Lot G1 « Coordonnées des profils » (26/10/2026, go de Jérémie le 26/10).
--
-- Constat (base, 26/10/2026) : 36 profils français à code postal sans
-- coordonnées. 28 n'ont pas de ville : trg_geocode_profile s'arrêtait dès que
-- la ville était vide, alors qu'un code postal valide suffit à situer le
-- membre. Un échec passager n'était jamais repris (Clarensac, 30870, annonce
-- publiée, qui retenait aussi la liste de /search, lot perf 9).
--
-- 1. trg_geocode_profile part aussi pour un profil sans ville avec un code
--    postal français valide (cinq chiffres, hors 00000) ; geocode-profile le
--    situe au centre de la commune la plus peuplée du code postal.
-- 2. Tâche planifiée geocode-profiles-backfill, chaque nuit à 03 h 17 UTC :
--    geocode-profile en mode backfill reprend les profils sans position
--    modifiés depuis plus d'une heure et moins de 7 jours (40 au plus),
--    journalisé dans cron_run_log (geocode-profile-backfill).
-- 3. Reprise unique des profils sans ville déjà enregistrés.
-- Rejouable.

CREATE OR REPLACE FUNCTION public.trg_geocode_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/geocode-profile';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY';
  v_secret text;
  v_status_id bigint;
  v_has_city boolean := NEW.city IS NOT NULL AND length(trim(NEW.city)) > 0;
  v_has_fr_postal boolean := coalesce(NEW.postal_code, '') ~ '^[0-9]{5}$'
    AND NEW.postal_code <> '00000'
    AND upper(coalesce(nullif(trim(NEW.country), ''), 'FR')) IN ('FR', 'FRANCE');
BEGIN
  -- Lot G1 : une ville, ou à défaut un code postal français valide.
  IF NOT v_has_city AND NOT v_has_fr_postal THEN
    RETURN NEW;
  END IF;

  -- Skip si rien de pertinent n'a changé ET coords déjà présentes
  -- (évite les boucles quand l'edge function réécrit lat/lng).
  -- Le pays fait partie des paramètres pertinents : sans lui, un membre
  -- qui corrige son pays gardait des coordonnées de l'ancien pays.
  IF TG_OP = 'UPDATE'
     AND OLD.city IS NOT DISTINCT FROM NEW.city
     AND OLD.postal_code IS NOT DISTINCT FROM NEW.postal_code
     AND OLD.country IS NOT DISTINCT FROM NEW.country
     AND NEW.latitude IS NOT NULL
     AND NEW.longitude IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'GEOCODE_PROFILE_SECRET'
  LIMIT 1;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'x-geocode-secret', v_secret
    ),
    body := jsonb_build_object('user_id', NEW.id)
  ) INTO v_status_id;

  IF v_status_id IS NULL THEN
    RAISE NOTICE 'geocode-profile dispatch: net.http_post returned NULL status_id for user %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'geocode-profile dispatch failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- 2. Rattrapage quotidien (rejouable : planification remplacée si présente).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'geocode-profiles-backfill') THEN
    PERFORM cron.unschedule('geocode-profiles-backfill');
  END IF;
END $$;

SELECT cron.schedule(
  'geocode-profiles-backfill',
  '17 3 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/geocode-profile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-geocode-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'GEOCODE_PROFILE_SECRET' LIMIT 1)
    ),
    body := '{"mode":"backfill"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cmd$
);

-- 3. Reprise unique : un profil sans ville, à code postal français valide et
-- sans position repasse par le trigger (valeur inchangée, UPDATE OF
-- postal_code suffit à le déclencher).
UPDATE public.profiles
SET postal_code = postal_code
WHERE latitude IS NULL
  AND (city IS NULL OR length(trim(city)) = 0)
  AND postal_code ~ '^[0-9]{5}$'
  AND postal_code <> '00000'
  AND upper(coalesce(nullif(trim(country), ''), 'FR')) IN ('FR', 'FRANCE');
