-- Lot DIG1 (14/11/2026) : le récapitulatif quotidien des gardiens passe deux
-- fois par heure (minutes 05 et 35, de 05 h à 12 h UTC) au lieu d'une.
-- Repère : dig1_recap_gardiens_demi_heure. Rejouable.
--
-- Mesure en base (cron_run_log, 06/11 au 14/11/2026) : un passage envoie au
-- plus 55 récapitulatifs (budget de 110 secondes, un envoi toutes les
-- 2 secondes, cadence mesurée le 26/08). Les jours chargés, la file s'écoule
-- en trois ou quatre passages horaires : 07/11, 197 en attente à 11 h 05 UTC
-- et fin le lendemain ; 08/11, fin à 10 h 05 UTC ; 12/11, fin à 10 h 05 UTC.
-- Les restes en fin de matinée sont des gardiens déjà servis par le
-- récapitulatif de proximité (un seul email quotidien par personne), écartés
-- à dessein. Avec un passage toutes les 30 minutes, une file de 200 s'écoule
-- en deux heures au lieu de quatre. Un passage sans file finit en quelques
-- secondes ; le verrou de bail empêche deux passages simultanés.

DO $do$
BEGIN
  -- dig1_recap_gardiens_demi_heure
  PERFORM cron.alter_job(job_id := j.jobid, schedule := '5,35 5-12 * * *')
  FROM cron.job j WHERE j.jobname = 'sitter-daily-digest';
END
$do$;
