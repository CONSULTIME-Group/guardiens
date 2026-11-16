-- Lot JOURN2 (16/11/2026, conseil du 16/11, accord de Jeremie « go tout »).
-- Repere : journ2_taches_journalisees.
--
-- Constat du 16/11/2026 : 20 taches pg_cron actives sur 72 n'ecrivaient rien
-- dans cron_run_log, et 96 appels pg_net sur 1 671 en 6 heures ont depasse
-- leur delai DNS, tous partis sur une minute multiple de 5 (meme panne que
-- celle du lot REL1b le 13/11). Un passage perdu ne laissait aucune trace.
--
-- 1. Horaires : chaque tache appelee par pg_net (net.http_post) qui part sur
--    une minute multiple de 5 passe sur une minute voisine, dans la meme
--    heure, heures inchangees (les taches calees sur l'heure de Paris gardent
--    leurs deux heures UTC, lot CRON2). Les taches lancees chaque minute
--    (* * * * *) et les taches purement SQL ne changent pas. Une tache dont
--    l'horaire en base n'est ni l'ancien ni le nouveau est laissee telle
--    quelle (NOTICE) : quelqu'un l'a deja reglee a la main.
-- 2. admin_cron_health suit les six fonctions journalisees par ce lot
--    (withCronRunLog ou withCronFailureLog). Le corps part de
--    pg_get_functiondef (lu en production le 16/11/2026) et recoit seulement
--    les lignes, leur delai de grace et le repere. Memes droits.
--    enrich-guide-places-osm reste hors de cette liste : sa tache de 10
--    minutes ne part que s'il reste un lieu a noter, un silence n'y est pas
--    une panne ; ses echecs sont ecrits dans cron_run_log.
--
-- Ordre de mise en ligne : fusion, deploiement des fonctions modifiees par
-- l'agent Lovable, puis cette migration. Aucune donnee modifiee. Rejouable.

-- journ2_taches_journalisees : horaires hors des minutes multiples de 5.
DO $journ2_horaires$
DECLARE
  r record;
  v_job bigint;
  v_current text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('alert-admin-signals-daily', '35 5 * * *', '37 5 * * *'),
      ('alert-content-quality', '30 7 * * 1', '33 7 * * 1'),
      ('alert-digest-12h', '0 10,11 * * *', '2 10,11 * * *'),
      ('alert-digest-18h', '0 16,17 * * *', '2 16,17 * * *'),
      ('alert-digest-8h', '35 5-8 * * *', '39 5-8 * * *'),
      ('analysis-requests-digest-daily', '0 7 * * *', '4 7 * * *'),
      ('auto_close_small_missions_daily', '0 3 * * *', '3 3 * * *'),
      ('auto-transition-sits', '0 * * * *', '2 * * * *'),
      ('close-orphan-applications-daily', '25 9 * * *', '27 9 * * *'),
      ('consume-seo-dirty-hourly', '10,25,40,55 * * * *', '11,26,41,56 * * * *'),
      ('daily-admin-activity-analysis', '30 5 * * *', '32 5 * * *'),
      ('detect-deploy-and-mark-dirty-10min', '*/10 * * * *', '3-59/10 * * * *'),
      ('email-delivery-daily', '0 7 * * *', '6 7 * * *'),
      ('email-pipeline-watchdog', '*/5 * * * *', '1-59/5 * * * *'),
      ('enrich-guide-places-osm', '20 3 * * *', '8 3 * * *'),
      ('enrich-guide-places-rating', '5,15,25,35,45,55 * * * *', '4,14,24,34,44,54 * * * *'),
      ('evaluate-journeys-hourly', '15 * * * *', '16 * * * *'),
      ('geocode-city-pages', '*/10 * * * *', '7-59/10 * * * *'),
      ('mass-email-watchdog', '*/5 * * * *', '3-59/5 * * * *'),
      ('messaging-reminders-daily', '0 10 * * *', '3 10 * * *'),
      ('mission-response-waiting-hourly', '30 * * * *', '33 * * * *'),
      ('nearby-daily-digest', '5 6-11 * * *', '8 6-11 * * *'),
      ('notify-mission-wave', '25 * * * *', '28 * * * *'),
      ('notify-sitters-on-publish', '*/15 * * * *', '2-59/15 * * * *'),
      ('nudge-affinity-onboarding', '0 18 * * *', '3 18 * * *'),
      ('nudge-missing-photo-weekly', '0 9 * * 4', '4 9 * * 4'),
      ('nudge-owner-no-applications', '0 10 * * *', '6 10 * * *'),
      ('nudge-owner-unconfirmed-sit', '40 8 * * *', '43 8 * * *'),
      ('nudge-repeated-cancellations', '0 10 * * 4', '8 10 * * 4'),
      ('nudge-repeated-republished-sits', '0 12 * * 5', '3 12 * * 5'),
      ('nudge-sitter-dormant', '0 11 * * 1', '3 11 * * 1'),
      ('nudge-sitter-gallery-photo-weekly', '0 10 * * 5', '9 10 * * 5'),
      ('nudge-stale-draft', '0 7 * * *', '2 7 * * *'),
      ('nudge-suspicious-accounts', '0 */4 * * *', '4 */4 * * *'),
      ('nudge-untapped-cities', '0 8 * * 3', '3 8 * * 3'),
      ('nudge-verification-stale', '0 9 * * 2', '3 9 * * 2'),
      ('publish_stale_reviews_daily', '20 5 * * *', '23 5 * * *'),
      ('purge-identity-documents-daily', '15 3 * * *', '16 3 * * *'),
      ('relance-cp-manquant', '30 9 * * 1', '34 9 * * 1'),
      ('remind-unread-messages-daily', '0 16 * * *', '4 16 * * *'),
      ('send_mission_nudges_daily', '0 9 * * *', '2 9 * * *'),
      ('send_mutual_aid_weekly_digest_mardi', '0 8 * * 2', '4 8 * * 2'),
      ('send_mutual_aid_weekly_digest_rattrapage', '0 10 * * 2', '4 10 * * 2'),
      ('send_sit_draft_reminder_daily', '0 8 * * *', '6 8 * * *'),
      ('send-avis-j1', '0 7 * * *', '1 7 * * *'),
      ('send-avis-j10', '30 7 * * *', '31 7 * * *'),
      ('send-avis-j20', '45 7 * * *', '47 7 * * *'),
      ('send-avis-j5', '15 7 * * *', '17 7 * * *'),
      ('send-mission-meetup-prompt', '40 * * * *', '42 * * * *'),
      ('send-rappel-j48', '10 6 * * *', '12 6 * * *'),
      ('send-rappel-j7', '5 6 * * *', '7 6 * * *'),
      ('send-sit-reminders', '0 6 * * *', '1 6 * * *'),
      ('send-weekly-nearby-digest', '5 8,9 * * 3', '9 8,9 * * 3'),
      ('sitter-daily-digest', '5,35 5-12 * * *', '6,36 5-12 * * *'),
      -- Toutes les deux minutes touchait 0, 10, 20... : minutes impaires hors
      -- 5, 15, 25... (24 passages par heure au lieu de 30, 4 minutes au plus
      -- entre deux passages ; verrou de 3 minutes de la fonction inchange).
      ('source-guide-places', '*/2 * * * *',
        '1,3,7,9,11,13,17,19,21,23,27,29,31,33,37,39,41,43,47,49,51,53,57,59 * * * *')
    ) AS t(jobname, old_schedule, new_schedule)
  LOOP
    SELECT jobid, schedule INTO v_job, v_current FROM cron.job WHERE jobname = r.jobname;
    IF v_job IS NULL THEN
      RAISE NOTICE 'JOURN2 : tache % absente, ignoree', r.jobname;
    ELSIF v_current = r.new_schedule THEN
      NULL;
    ELSIF v_current = r.old_schedule THEN
      PERFORM cron.alter_job(job_id := v_job, schedule := r.new_schedule);
    ELSE
      RAISE NOTICE 'JOURN2 : tache % a l''horaire % (attendu %), laissee telle quelle',
        r.jobname, v_current, r.old_schedule;
    END IF;
  END LOOP;
END
$journ2_horaires$;

-- journ2_taches_journalisees : suivi par admin_cron_health.
DO $journ2_sante$
DECLARE
  d text := pg_get_functiondef('public.admin_cron_health()'::regprocedure);
  a_cron constant text := $a$      ('mass-email-watchdog', 60, 'Veilleur des envois groupés')$a$;
  a_grace constant text := $a$      ('mass-email-watchdog', timestamptz '2026-11-12 08:00:00+00')$a$;
BEGIN
  IF position('journ2_taches_journalisees' IN d) > 0 THEN
    RETURN;
  END IF;
  IF position(a_cron IN d) = 0 OR position(a_grace IN d) = 0 THEN
    RAISE EXCEPTION 'JOURN2 : ancre absente de admin_cron_health, migration a reprendre depuis pg_get_functiondef';
  END IF;
  d := replace(d, a_cron, a_cron || $n$,
      -- journ2_taches_journalisees : passages ecrits depuis le 16/11/2026.
      ('alert-content-quality', 10080, 'Alerte hebdomadaire de qualité du contenu'),
      ('send-analysis-requests-digest', 1440, 'Récapitulatif des demandes d''analyse'),
      ('email-delivery-daily', 1440, 'Rapport quotidien de délivrabilité'),
      ('send-mission-meetup-prompt', 60, 'Question de rencontre après un coup de main'),
      ('geocode-city-pages', 60, 'Géocodage des pages villes'),
      ('source-guide-places', 60, 'Génération des guides locaux')$n$);
  d := replace(d, a_grace, a_grace || $n$,
      ('alert-content-quality', timestamptz '2026-11-24 08:00:00+00'),
      ('send-analysis-requests-digest', timestamptz '2026-11-17 08:00:00+00'),
      ('email-delivery-daily', timestamptz '2026-11-17 08:00:00+00'),
      ('send-mission-meetup-prompt', timestamptz '2026-11-17 08:00:00+00'),
      ('geocode-city-pages', timestamptz '2026-11-17 08:00:00+00'),
      ('source-guide-places', timestamptz '2026-11-17 08:00:00+00')$n$);
  EXECUTE d;
END
$journ2_sante$;
