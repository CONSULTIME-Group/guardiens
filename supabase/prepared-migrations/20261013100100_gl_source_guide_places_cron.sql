-- Lots GL (13/10/2026, protocole GL4 du 14/10/2026) : file de génération des
-- guides locaux, toutes les deux minutes.
-- Référence au coffre-fort : à exécuter dans l'éditeur SQL du backend, pas par
-- l'outil de migration. Chaque passage fait avancer d'une étape les guides en
-- cours (3 au plus) et répond tout de suite : l'appel pg_net reste court.
DO $activation$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'source-guide-places') THEN
    RAISE NOTICE 'source_guide_places_cron_already_exists';
    RETURN;
  END IF;
  PERFORM cron.schedule('source-guide-places', '*/2 * * * *', $job$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/source-guide-places',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-geocode-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'GEOCODE_PROFILE_SECRET' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$);
END;
$activation$;

-- Retrait si besoin :
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='source-guide-places';
