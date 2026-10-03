-- A appliquer seulement apres verification du nouveau consume-seo-dirty deploye.
-- Desactivation reversible du doublon ; aucun job n'est invoque ou supprime.
CREATE TABLE public._backup_prerender_jobs_20261003_1830 (
  kind text NOT NULL,
  name text NOT NULL,
  data jsonb NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (kind, name)
);
ALTER TABLE public._backup_prerender_jobs_20261003_1830 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_prerender_jobs_20261003_1830 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_prerender_jobs_20261003_1830 TO service_role;
-- Aucun en-tete, secret ou texte de commande n'est copie.
INSERT INTO public._backup_prerender_jobs_20261003_1830 (kind,name,data)
SELECT 'job',jobname,jsonb_build_object('job_id',jobid,'schedule',schedule,'active',active)
FROM cron.job
WHERE jobname IN ('flush-prerender-cache','consume-seo-dirty-hourly');
INSERT INTO public._backup_prerender_jobs_20261003_1830 (kind,name,data)
SELECT 'function',proname,jsonb_build_object('definition',pg_get_functiondef(oid),'acl',proacl)
FROM pg_proc WHERE oid='public.admin_cron_health()'::regprocedure;

DO $guard$
DECLARE
  legacy_job_id bigint;
  health_definition text;
BEGIN
  IF (SELECT count(*) FROM public._backup_prerender_jobs_20261003_1830) <> 3 THEN
    RAISE EXCEPTION 'Les deux jobs et la supervision attendus doivent etre sauvegardes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job
    WHERE jobname='consume-seo-dirty-hourly' AND active AND schedule='10,25,40,55 * * * *') THEN
    RAISE EXCEPTION 'Le consommateur plafonne actif attendu est absent ou modifie';
  END IF;
  SELECT jobid INTO legacy_job_id FROM cron.job
    WHERE jobname='flush-prerender-cache' AND active AND schedule='*/15 * * * *';
  IF legacy_job_id IS NULL THEN RAISE EXCEPTION 'Le doublon attendu est absent ou modifie'; END IF;

  health_definition := pg_get_functiondef('public.admin_cron_health()'::regprocedure);
  IF md5(health_definition) <> '7ff1efd3e1a41d193193c10869783f4e' THEN
    RAISE EXCEPTION 'La definition de supervision a change, une nouvelle revue est necessaire';
  END IF;
  -- La supervision suit le detecteur actif a la place du job desactive.
  EXECUTE replace(health_definition,
    '(''flush-prerender-cache'', 15, ''Rafraîchissement Prerender''),',
    '(''detect-deploy-and-mark-dirty'', 10, ''Détection des déploiements SEO''),');
  PERFORM cron.alter_job(legacy_job_id, active := false);
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobid=legacy_job_id AND active) THEN
    RAISE EXCEPTION 'Le doublon doit etre desactive';
  END IF;
END;
$guard$;