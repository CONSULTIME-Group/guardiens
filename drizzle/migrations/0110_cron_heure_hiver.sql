DO $$
BEGIN
  IF (SELECT count(*) FROM cron.job WHERE jobname IN ('alert-digest-12h', 'alert-digest-18h', 'nearby-daily-digest')) <> 3 THEN
    RAISE EXCEPTION 'Tâches des récapitulatifs introuvables';
  END IF;
  PERFORM cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname = 'alert-digest-12h'), schedule := '0 10,11 * * *');
  PERFORM cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname = 'alert-digest-18h'), schedule := '0 16,17 * * *');
  PERFORM cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname = 'nearby-daily-digest'), schedule := '5 6-11 * * *');
  IF (SELECT count(*) FROM cron.job WHERE active AND (
        (jobname = 'alert-digest-12h' AND schedule = '0 10,11 * * *')
     OR (jobname = 'alert-digest-18h' AND schedule = '0 16,17 * * *')
     OR (jobname = 'nearby-daily-digest' AND schedule = '5 6-11 * * *'))) <> 3 THEN
    RAISE EXCEPTION 'Horaires des récapitulatifs non conformes après modification';
  END IF;
END $$;