-- Lot REL1b (13/11/2026) : la relance des candidatures en attente passe de la
-- minute 00 à la minute 07 (09 h 07 et 17 h 07 UTC, soit 10 h 07 et 18 h 07 à
-- Paris l'hiver). Horaire seul, appliqué en production le 13/11/2026 à 10 h 30
-- sur accord de Jérémie. Repère : rel1b_horaire_relances.
--
-- Pourquoi : le 13/11 à 09 h 00 UTC, 5 des 12 appels pg_net partis à cette
-- minute ont échoué avant d'atteindre leur fonction (délai DNS de 5 secondes,
-- net._http_response). Le passage de nudge-owner-pending-application n'a laissé
-- aucune ligne dans cron_run_log, comme celui du 12/11 à 09 h 00 UTC. Un appel
-- perdu fait sauter la relance à 48 heures, la relance des discussions arrêtées
-- et les balayages du lot REL1 jusqu'au passage suivant.
-- Rejouable.
DO $$
DECLARE
  v_job bigint;
BEGIN
  SELECT jobid INTO v_job FROM cron.job WHERE jobname = 'nudge-owner-pending-application';
  IF v_job IS NOT NULL THEN
    PERFORM cron.alter_job(job_id := v_job, schedule := '7 9,17 * * *');
  END IF;
END
$$;
