-- JOURN1 (11/11/2026, revue des taches planifiees, accord de Jeremie) :
-- les deux tuyaux d'envoi a la minute (flush-deferred-emails,
-- process-mass-email-queue) et les deux veilleurs (email-pipeline-watchdog,
-- mass-email-watchdog) ecrivent desormais chaque echec et un succes par heure
-- dans cron_run_log (withCronFailureLog). Cette migration les ajoute aux
-- taches suivies par admin_cron_health : battement attendu toutes les 60
-- minutes, etat critique apres 120 minutes de silence.
-- Le corps de la fonction part de pg_get_functiondef en production et recoit
-- seulement les quatre lignes, leur delai de grace et le repere
-- journ1_tuyaux_suivis. Memes droits. Aucune donnee modifiee. Rejouable.
DO $journ1$
DECLARE
  d text := pg_get_functiondef('public.admin_cron_health()'::regprocedure);
  a_cron constant text := $a$      ('send-nearby-daily-digest', 1440, 'Récapitulatif quotidien des annonces à proximité')$a$;
  a_grace constant text := $a$      ('admin-activity-analysis', timestamptz '2026-10-18 16:00:00+00')$a$;
BEGIN
  IF position('journ1_tuyaux_suivis' IN d) > 0 THEN
    RETURN;
  END IF;
  IF position(a_cron IN d) = 0 OR position(a_grace IN d) = 0 THEN
    RAISE EXCEPTION 'JOURN1 : ancre absente de admin_cron_health, migration a reprendre depuis pg_get_functiondef';
  END IF;
  d := replace(d, a_cron, a_cron || $n$,
      -- journ1_tuyaux_suivis : un battement par heure, chaque echec ecrit.
      ('flush-deferred-emails', 60, 'Envoi des emails différés'),
      ('process-mass-email-queue', 60, 'File des envois groupés'),
      ('email-pipeline-watchdog', 60, 'Veilleur de la chaîne emails'),
      ('mass-email-watchdog', 60, 'Veilleur des envois groupés')$n$);
  d := replace(d, a_grace, a_grace || $n$,
      ('flush-deferred-emails', timestamptz '2026-11-12 08:00:00+00'),
      ('process-mass-email-queue', timestamptz '2026-11-12 08:00:00+00'),
      ('email-pipeline-watchdog', timestamptz '2026-11-12 08:00:00+00'),
      ('mass-email-watchdog', timestamptz '2026-11-12 08:00:00+00')$n$);
  EXECUTE d;
END
$journ1$;
