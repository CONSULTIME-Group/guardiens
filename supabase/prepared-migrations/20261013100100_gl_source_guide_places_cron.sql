-- Lots GL (13/10/2026) : file de sourcing des guides locaux.
-- Référence au coffre-fort : à exécuter dans l'éditeur SQL du backend, pas par
-- l'outil de migration. Un guide toutes les 4 minutes : la file des 101 guides
-- passe en 7 heures environ, puis chaque appel ne fait qu'une lecture vide.
-- Un guide en panne Overpass repasse une heure plus tard. La fonction répond
-- tout de suite et travaille en arrière-plan : l appel pg_net reste court.
DO $activation$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'source-guide-places') THEN
    RAISE NOTICE 'source_guide_places_cron_already_exists';
    RETURN;
  END IF;
  PERFORM cron.schedule('source-guide-places', '*/4 * * * *', $job$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/source-guide-places',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-geocode-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'GEOCODE_PROFILE_SECRET' LIMIT 1)
      ),
      body := '{"limit":1}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$);
END;
$activation$;

-- Retrait si besoin :
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='source-guide-places';
