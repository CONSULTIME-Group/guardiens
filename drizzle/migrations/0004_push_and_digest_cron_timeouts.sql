-- Point 4 : le job 109 (nearby-daily-digest) a été réécrit le 19/09 sans
-- timeout_milliseconds, contrairement aux jobs 12, 13 et 14 qui ont 30000.
-- La commande existante est reprise telle quelle et seule l'option de timeout
-- y est insérée : horaire, nom, URL, en-têtes et lecture du coffre restent
-- strictement identiques, aucune valeur sensible n'est lue ni écrite ici.
-- Point 5c : la file push est vide la quasi-totalité du temps au nombre
-- d'abonnés actuel, la cadence du job 1224 passe de la minute à cinq minutes.
DO $migration$
DECLARE v_cmd text; v_new text;
BEGIN
  SELECT command INTO v_cmd FROM cron.job WHERE jobid = 109 AND jobname = 'nearby-daily-digest';
  IF v_cmd IS NULL THEN RAISE EXCEPTION 'Job 109 nearby-daily-digest introuvable'; END IF;
  IF (SELECT count(*) FROM cron.job WHERE jobid = 1224 AND jobname = 'dispatch-web-push') <> 1 THEN
    RAISE EXCEPTION 'Job 1224 dispatch-web-push introuvable';
  END IF;

  CREATE TABLE IF NOT EXISTS public._backup_cron_observability_20260920 AS
    SELECT jobid, jobname, schedule, active, command FROM cron.job WHERE jobid IN (109, 1224);
  ALTER TABLE public._backup_cron_observability_20260920 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_cron_observability_20260920 FROM PUBLIC, anon, authenticated;

  IF position('timeout_milliseconds' in v_cmd) = 0 THEN
    v_new := regexp_replace(v_cmd, '\)\s*\) AS request_id',
      E'),\n          timeout_milliseconds := 30000\n        ) AS request_id');
    IF v_new = v_cmd THEN RAISE EXCEPTION 'Commande du job 109 non reconnue, aucune réécriture'; END IF;
    PERFORM cron.alter_job(job_id := 109, command := v_new);
  END IF;

  PERFORM cron.alter_job(job_id := 1224, schedule := '*/5 * * * *');

  IF (SELECT count(*) FROM cron.job WHERE jobid = 109 AND jobname = 'nearby-daily-digest'
      AND schedule = '5 6-9 * * *' AND active
      AND command LIKE '%timeout_milliseconds := 30000%') <> 1 THEN
    RAISE EXCEPTION 'Job 109 non conforme après réécriture';
  END IF;
  IF (SELECT count(*) FROM cron.job WHERE jobid = 1224 AND schedule = '*/5 * * * *' AND active) <> 1 THEN
    RAISE EXCEPTION 'Job 1224 non conforme après réécriture';
  END IF;
END;
$migration$;