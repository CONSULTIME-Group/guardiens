-- NON APPLIQUÉE. À exécuter seulement sur GO explicite.
-- Le dossier supabase/migrations est géré par l'outil de migration, ce fichier
-- est donc déposé ici en attente d'application.
--
-- Corrélation formelle entre la commande pg_cron, la réponse de l'Edge et
-- public.cron_run_log pour les deux digests.
--
-- Chaque invocation naturelle tire un identifiant unique (gen_random_uuid),
-- transmis simultanément en en-tête `x-guardiens-trace-id` et dans le corps
-- JSON (`trace_id`). L'Edge le renvoie dans sa réponse et le range dans
-- metrics. Les trois couches se relient alors sans dépendre de l'horaire.
--
-- Seules les COMMANDES des jobs 12, 13, 14 (send-alert-digest) et 109
-- (send-nearby-daily-digest) changent. Noms, horaires et activation sont
-- préservés à l'identique. Aucun secret n'est copié dans ce fichier : le
-- bearer est toujours lu dans Vault au moment de l'exécution.
--
-- Migration atomique et idempotente : rejouée, elle réécrit exactement les
-- mêmes commandes et conserve la sauvegarde d'origine.
DO $migration$
DECLARE
  target record;
  target_job_id bigint;
  matching_jobs integer;
  backup_rows integer;
BEGIN
  -- Assertion 1 : le secret doit exister, sinon la réécriture produirait des
  -- commandes sans authentification.
  IF (SELECT count(*) FROM vault.decrypted_secrets
      WHERE name = 'supabase_service_role_key' AND length(decrypted_secret) > 0) <> 1 THEN
    RAISE EXCEPTION 'Vault indisponible : supabase_service_role_key attendu une seule fois, non vide';
  END IF;

  -- Assertion 2 : les quatre jobs doivent exister, une seule fois chacun.
  FOR target IN
    SELECT * FROM (VALUES
      ('alert-digest-8h'),
      ('alert-digest-12h'),
      ('alert-digest-18h'),
      ('nearby-daily-digest')
    ) AS targets(job_name)
  LOOP
    SELECT count(*) INTO matching_jobs FROM cron.job WHERE jobname = target.job_name;
    IF matching_jobs <> 1 THEN
      RAISE EXCEPTION 'Cron % attendu une seule fois, trouvé %', target.job_name, matching_jobs;
    END IF;
  END LOOP;

  -- Sauvegarde protégée des quatre commandes, avant tout remplacement.
  CREATE TABLE IF NOT EXISTS public._backup_digest_cron_20260919 AS
    SELECT jobid, jobname, schedule, active, command
    FROM cron.job
    WHERE jobname IN ('alert-digest-8h', 'alert-digest-12h', 'alert-digest-18h', 'nearby-daily-digest');
  ALTER TABLE public._backup_digest_cron_20260919 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_digest_cron_20260919 FROM PUBLIC, anon, authenticated;

  SELECT count(*) INTO backup_rows FROM public._backup_digest_cron_20260919;
  IF backup_rows <> 4 THEN
    RAISE EXCEPTION 'Sauvegarde incomplète : 4 commandes attendues, % trouvées', backup_rows;
  END IF;

  -- Remplacement des commandes, une seule couche modifiée.
  FOR target IN
    SELECT * FROM (VALUES
      ('alert-digest-8h', 'send-alert-digest', 30000),
      ('alert-digest-12h', 'send-alert-digest', 30000),
      ('alert-digest-18h', 'send-alert-digest', 30000),
      ('nearby-daily-digest', 'send-nearby-daily-digest', NULL::integer)
    ) AS targets(job_name, function_name, timeout_ms)
  LOOP
    SELECT jobid INTO target_job_id FROM cron.job WHERE jobname = target.job_name;

    PERFORM cron.alter_job(
      job_id := target_job_id,
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
            'x-guardiens-trace-id', trace.trace_id
          ),
          body := jsonb_build_object('trace_id', trace.trace_id, 'time', now())%s
        ) AS request_id
        FROM trace;
      $command$,
      'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/' || target.function_name,
      CASE WHEN target.timeout_ms IS NULL THEN ''
           ELSE format(', timeout_milliseconds := %s', target.timeout_ms) END)
    );
  END LOOP;

  -- Assertion finale : horaires, noms et activation intacts.
  IF EXISTS (
    SELECT 1
    FROM public._backup_digest_cron_20260919 b
    JOIN cron.job j ON j.jobid = b.jobid
    WHERE j.jobname IS DISTINCT FROM b.jobname
       OR j.schedule IS DISTINCT FROM b.schedule
       OR j.active IS DISTINCT FROM b.active
  ) THEN
    RAISE EXCEPTION 'Nom, horaire ou activation modifié, annulation complète';
  END IF;
END;
$migration$;
