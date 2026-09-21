-- Appliqué le 21/09/2026 (job cron 1246, 25 * * * *, actif), ne pas rejouer.
-- Planification horaire du moteur de vagues de l'Entraide.
-- A exécuter dans l'éditeur SQL du backend : la référence au coffre-fort
-- n'est pas applicable par l'outil de migration.
-- La fonction n'écrit cron_run_log que si elle a envoyé ou relancé quelque
-- chose, et ne fait rien pendant les heures calmes de Paris (22 h à 8 h).
DO $activation$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-mission-wave') THEN
    RAISE NOTICE 'notify_mission_wave_cron_already_exists';
    RETURN;
  END IF;
  PERFORM cron.schedule('notify-mission-wave', '25 * * * *', $job$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/notify-mission-wave',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name='supabase_service_role_key' LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 50000
    );
  $job$);
END;
$activation$;

-- Retrait si besoin :
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='notify-mission-wave';
