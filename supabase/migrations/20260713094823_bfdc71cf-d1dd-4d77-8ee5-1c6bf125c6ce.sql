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
BEGIN
  IF NEW.city IS NULL OR length(trim(NEW.city)) = 0 THEN
    RETURN NEW;
  END IF;

  -- Skip si rien de pertinent n'a changé ET coords déjà présentes
  -- (évite les boucles quand l'edge function réécrit lat/lng).
  IF TG_OP = 'UPDATE'
     AND OLD.city IS NOT DISTINCT FROM NEW.city
     AND OLD.postal_code IS NOT DISTINCT FROM NEW.postal_code
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

UPDATE public.profiles
SET updated_at = now()
WHERE city IS NOT NULL
  AND postal_code IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL);