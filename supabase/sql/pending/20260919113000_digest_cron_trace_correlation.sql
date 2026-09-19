-- NON APPLIQUÉE. À exécuter seulement sur GO explicite.
-- Le dossier supabase/migrations est géré par l'outil de migration, ce fichier
-- est donc déposé ici en attente d'application.
--
-- Corrélation formelle entre la commande pg_cron, la réponse de l'Edge et
-- public.cron_run_log pour les deux digests.
--
-- Chaque invocation naturelle tire un identifiant unique (gen_random_uuid)
-- et transmet, en en-tête comme dans le corps JSON, ce trace_id ainsi que son
-- jobid pg_cron réel (12, 13, 14 ou 109). L'Edge valide le jobid contre la
-- liste autorisée de sa fonction, renvoie les deux valeurs dans sa réponse et
-- les range dans cron_run_log.metrics. La chaîne job précis, réponse HTTP,
-- journal devient explicite, sans dépendre de l'horaire.
--
-- Cibles verrouillées par couple exact (jobid, jobname) :
--   12  alert-digest-8h        -> send-alert-digest
--   13  alert-digest-12h       -> send-alert-digest
--   14  alert-digest-18h       -> send-alert-digest
--   109 nearby-daily-digest    -> send-nearby-daily-digest
-- Aucun autre job n'est lu ni écrit, en particulier pas les jobs 64 et 653.
-- Noms, horaires et activation sont préservés à l'identique. Aucun secret
-- n'est copié ici : le bearer est lu dans Vault au moment de l'exécution.
--
-- Migration atomique et idempotente : rejouée, elle réécrit exactement les
-- mêmes commandes et conserve la sauvegarde d'origine. Toute cible absente,
-- mal nommée ou ambiguë fait échouer l'ensemble, sans application partielle.
DO $migration$
DECLARE
  target record;
  matching_jobs integer;
  backup_rows integer;
BEGIN
  -- Assertion 1 : le secret doit exister, sinon la réécriture produirait des
  -- commandes sans authentification.
  IF (SELECT count(*) FROM vault.decrypted_secrets
      WHERE name = 'supabase_service_role_key' AND length(decrypted_secret) > 0) <> 1 THEN
    RAISE EXCEPTION 'Vault indisponible : supabase_service_role_key attendu une seule fois, non vide';
  END IF;

  -- Assertion 2 : chaque couple (jobid, jobname) doit exister exactement une
  -- fois. Un jobname porté par un autre jobid, ou un jobid portant un autre
  -- nom, arrête la migration entière.
  FOR target IN
    SELECT * FROM (VALUES
      (12::bigint, 'alert-digest-8h'),
      (13::bigint, 'alert-digest-12h'),
      (14::bigint, 'alert-digest-18h'),
      (109::bigint, 'nearby-daily-digest')
    ) AS targets(job_id, job_name)
  LOOP
    SELECT count(*) INTO matching_jobs
    FROM cron.job
    WHERE jobid = target.job_id AND jobname = target.job_name;
    IF matching_jobs <> 1 THEN
      RAISE EXCEPTION 'Couple cron (%, %) attendu une seule fois, trouvé %',
        target.job_id, target.job_name, matching_jobs;
    END IF;

    -- Ambiguïté : le nom ne doit pas être porté par un second job.
    SELECT count(*) INTO matching_jobs FROM cron.job WHERE jobname = target.job_name;
    IF matching_jobs <> 1 THEN
      RAISE EXCEPTION 'Nom de cron % ambigu, % occurrences', target.job_name, matching_jobs;
    END IF;
  END LOOP;

  -- Sauvegarde protégée des quatre commandes, avant tout remplacement.
  CREATE TABLE IF NOT EXISTS public._backup_digest_cron_20260919 AS
    SELECT jobid, jobname, schedule, active, command
    FROM cron.job
    WHERE (jobid, jobname) IN (
      (12::bigint, 'alert-digest-8h'),
      (13::bigint, 'alert-digest-12h'),
      (14::bigint, 'alert-digest-18h'),
      (109::bigint, 'nearby-daily-digest')
    );
  ALTER TABLE public._backup_digest_cron_20260919 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_digest_cron_20260919 FROM PUBLIC, anon, authenticated;

  SELECT count(*) INTO backup_rows FROM public._backup_digest_cron_20260919;
  IF backup_rows <> 4 THEN
    RAISE EXCEPTION 'Sauvegarde incomplète : 4 commandes attendues, % trouvées', backup_rows;
  END IF;

  IF (SELECT count(*) FROM public._backup_digest_cron_20260919
      WHERE jobid NOT IN (12, 13, 14, 109)) > 0 THEN
    RAISE EXCEPTION 'Sauvegarde hors périmètre : seuls les jobid 12, 13, 14 et 109 sont admis';
  END IF;

  -- Remplacement des commandes, une seule couche modifiée.
  FOR target IN
    SELECT * FROM (VALUES
      (12::bigint, 'alert-digest-8h', 'send-alert-digest', 30000),
      (13::bigint, 'alert-digest-12h', 'send-alert-digest', 30000),
      (14::bigint, 'alert-digest-18h', 'send-alert-digest', 30000),
      (109::bigint, 'nearby-daily-digest', 'send-nearby-daily-digest', NULL::integer)
    ) AS targets(job_id, job_name, function_name, timeout_ms)
  LOOP
    PERFORM cron.alter_job(
      job_id := target.job_id,
      command := format($command$
        WITH trace AS (SELECT gen_random_uuid()::text AS trace_id)
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
              SELECT decrypted_secret FROM vault.decrypted_secrets
              WHERE name = 'supabase_service_role_key' LIMIT 1
            ),
            'x-guardiens-trace-id', trace.trace_id,
            'x-guardiens-cron-job-id', %L
          ),
          body := jsonb_build_object(
            'trace_id', trace.trace_id,
            'cron_job_id', %s,
            'time', now()
          )%s
        ) AS request_id
        FROM trace;
      $command$,
      'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/' || target.function_name,
      target.job_id::text,
      target.job_id::text,
      CASE WHEN target.timeout_ms IS NULL THEN ''
           ELSE format(', timeout_milliseconds := %s', target.timeout_ms) END)
    );
  END LOOP;

  -- Assertion finale : les quatre jobid exacts sont toujours là, avec leur
  -- nom, leur horaire et leur activation d'origine.
  IF (
    SELECT count(*)
    FROM public._backup_digest_cron_20260919 b
    JOIN cron.job j ON j.jobid = b.jobid
    WHERE b.jobid IN (12, 13, 14, 109)
      AND j.jobname IS NOT DISTINCT FROM b.jobname
      AND j.schedule IS NOT DISTINCT FROM b.schedule
      AND j.active IS NOT DISTINCT FROM b.active
  ) <> 4 THEN
    RAISE EXCEPTION 'Jobid, nom, horaire ou activation modifié, annulation complète';
  END IF;
END;
$migration$;
