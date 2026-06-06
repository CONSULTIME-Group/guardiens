-- Étend le trigger geocode pour réagir aussi aux changements de country
DROP TRIGGER IF EXISTS trg_profiles_geocode ON public.profiles;
CREATE TRIGGER trg_profiles_geocode
AFTER INSERT OR UPDATE OF city, postal_code, country ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_geocode_profile();

-- Force le re-géocodage de Dominique en appelant directement pg_net
-- (le trigger ne se redéclenche pas si city n'a pas changé).
UPDATE public.profiles SET latitude = NULL, longitude = NULL WHERE country = 'MA';

SELECT net.http_post(
  url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/geocode-profile',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY'
  ),
  body := jsonb_build_object('user_id', id)
)
FROM public.profiles
WHERE country = 'MA' AND city IS NOT NULL;
