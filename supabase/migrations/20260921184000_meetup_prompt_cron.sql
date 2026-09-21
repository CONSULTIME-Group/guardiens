-- A appliquer par Jérémie/Claude, référence Vault.
-- Planification horaire de la relance de fin d'échange de l'Entraide.
-- A exécuter dans l'éditeur SQL du backend : la référence au coffre-fort
-- n'est pas applicable par l'outil de migration.
-- Minute 40 pour rester décalé du moteur de vagues (minute 25).
DO $activation$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-mission-meetup-prompt') THEN
    RAISE NOTICE 'send_mission_meetup_prompt_cron_already_exists';
    RETURN;
  END IF;
  PERFORM cron.schedule('send-mission-meetup-prompt', '40 * * * *', $job$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-mission-meetup-prompt',
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
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='send-mission-meetup-prompt';
