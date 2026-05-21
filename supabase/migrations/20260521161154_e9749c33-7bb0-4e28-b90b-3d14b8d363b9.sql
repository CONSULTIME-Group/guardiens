-- Trigger : appelle l'edge function geocode-profile via pg_net
-- à chaque INSERT ou UPDATE de city/postal_code, dès lors que les coords
-- ne sont pas déjà cohérentes.

CREATE OR REPLACE FUNCTION public.trg_geocode_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/geocode-profile';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY';
BEGIN
  -- Skip si pas de city
  IF NEW.city IS NULL OR length(trim(NEW.city)) = 0 THEN
    RETURN NEW;
  END IF;

  -- Skip si rien n'a changé (UPDATE) ET coords déjà présentes
  IF TG_OP = 'UPDATE'
     AND OLD.city IS NOT DISTINCT FROM NEW.city
     AND OLD.postal_code IS NOT DISTINCT FROM NEW.postal_code
     AND NEW.latitude IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip si l'UPDATE concerne justement lat/lng (évite la boucle infinie
  -- quand l'edge function réécrit le profil).
  IF TG_OP = 'UPDATE'
     AND OLD.city IS NOT DISTINCT FROM NEW.city
     AND OLD.postal_code IS NOT DISTINCT FROM NEW.postal_code THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon
    ),
    body := jsonb_build_object('user_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'geocode-profile dispatch failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_geocode ON public.profiles;

CREATE TRIGGER trg_profiles_geocode
AFTER INSERT OR UPDATE OF city, postal_code ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_geocode_profile();