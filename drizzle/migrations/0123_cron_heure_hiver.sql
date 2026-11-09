-- Lot CRON2 (09/11/2026, recette NUR1, « suis tes reco je valide go » de Jérémie).
-- Les tâches des récapitulatifs sont écrites en heure UTC ; les fonctions ne
-- servent que l'heure de Paris visée (parisWindowVerdictForHours). Depuis le
-- passage à l'heure d'hiver (26/10/2026), alert-digest-12h et -18h passaient à
-- 11 h et 17 h à Paris et répondaient outside_target_hour : 29 passages, 0 envoi.
-- nearby-daily-digest s'arrêtait à 10 h à Paris : ses reprises de 11 h et 12 h
-- (lot NUR1) ne tournaient pas.
-- Deux heures UTC voisines couvrent l'été et l'hiver : un seul passage tombe
-- dans le créneau, l'autre répond outside_target_hour. Les reprises du
-- récapitulatif de proximité restent protégées par l'anti-doublon de 20 h.
-- Seul l'horaire change : commande, nom, en-têtes et lecture du coffre restent.
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
