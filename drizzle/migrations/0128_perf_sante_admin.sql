-- Lot PERF-ADM (09/11/2026, « d'accord avec tout, go » de Jérémie après
-- l'audit du soir). admin_work_list a dépassé le délai de 8 s deux fois le
-- 09/11 (20 h 03 et 20 h 10, code 57014) : pastille « ? », liste illisible.
-- Mesure (pg_stat_statements) : admin_site_health 3,4 à 4,9 s en moyenne,
-- 7,6 s au plus. Les lectures froides coûtent environ 8 ms par page :
--   * mesure d'audience : 7 000 pages vues sur 9 jours lues par l'index de
--     date, 20 000 lignes parcourues et filtrées, 7,6 s à froid ;
--   * admin_cron_health : trois parcours complets de cron_run_log
--     (48 000 lignes depuis le 12/07), 0,75 s chacun à froid.
-- Correctifs, sans changer aucun résultat :
--   1. index partiel des pages vues par date (compte en lecture d'index) ;
--   2. index de cron_run_log par tâche et date, avec statut et fin ;
--   3. admin_cron_health lit, pour chaque tâche suivie, son dernier passage,
--      ses trois derniers et ses 7 derniers jours (lectures bornées) ;
--   4. l'historique interne des tâches (cron.job_run_details, 216 000 lignes,
--      175 Mo) est gardé 7 jours au lieu de 30.
-- En production, les deux index sont créés avant, en CONCURRENTLY, pour ne
-- jamais bloquer les écritures ; IF NOT EXISTS les laisse ici sans effet.

CREATE INDEX IF NOT EXISTS analytics_events_page_view_created_idx
  ON public.analytics_events (created_at)
  WHERE event_type = 'page_view';

CREATE INDEX IF NOT EXISTS cron_run_log_edge_started_cover_idx
  ON public.cron_run_log (edge_name, started_at DESC)
  INCLUDE (status, finished_at);

DO $mig$
DECLARE
  d text;
  fixed text;
BEGIN
  SELECT pg_get_functiondef('public.admin_cron_health()'::regprocedure) INTO d;
  IF position('perf_adm_lectures_bornees' IN d) > 0 THEN
    RETURN;
  END IF;
  fixed := replace(d,
$q$  last_runs AS (
    SELECT DISTINCT ON (edge_name) edge_name, started_at, finished_at, status, error_message
    FROM public.cron_run_log ORDER BY edge_name, started_at DESC
  ),
  recent_stats AS (
    SELECT edge_name,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days') AS runs_7d,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days' AND status = 'failed') AS failed_7d,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days' AND status = 'partial') AS partial_7d
    FROM public.cron_run_log GROUP BY edge_name
  ),
  last_3 AS (
    SELECT edge_name, COUNT(*) FILTER (WHERE status = 'failed') AS failed_in_last_3
    FROM (SELECT edge_name, status,
            ROW_NUMBER() OVER (PARTITION BY edge_name ORDER BY started_at DESC) AS rn
          FROM public.cron_run_log WHERE finished_at IS NOT NULL) t
    WHERE rn <= 3 GROUP BY edge_name
  ),$q$,
$q$  -- perf_adm_lectures_bornees : une lecture d'index bornée par tâche suivie.
  last_runs AS (
    SELECT c.edge_name, l.started_at, l.finished_at, l.status, l.error_message
    FROM crons c
    CROSS JOIN LATERAL (
      SELECT r.started_at, r.finished_at, r.status, r.error_message
      FROM public.cron_run_log r
      WHERE r.edge_name = c.edge_name
      ORDER BY r.started_at DESC LIMIT 1
    ) l
  ),
  recent_stats AS (
    SELECT c.edge_name, s.runs_7d, s.failed_7d, s.partial_7d
    FROM crons c
    CROSS JOIN LATERAL (
      SELECT COUNT(*) AS runs_7d,
        COUNT(*) FILTER (WHERE r.status = 'failed') AS failed_7d,
        COUNT(*) FILTER (WHERE r.status = 'partial') AS partial_7d
      FROM public.cron_run_log r
      WHERE r.edge_name = c.edge_name AND r.started_at >= now() - interval '7 days'
    ) s
  ),
  last_3 AS (
    SELECT c.edge_name, t.failed_in_last_3
    FROM crons c
    CROSS JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE x.status = 'failed') AS failed_in_last_3
      FROM (
        SELECT r.status FROM public.cron_run_log r
        WHERE r.edge_name = c.edge_name AND r.finished_at IS NOT NULL
        ORDER BY r.started_at DESC LIMIT 3
      ) x
    ) t
  ),$q$);
  IF fixed = d THEN
    RAISE EXCEPTION 'admin_cron_health : lectures de cron_run_log introuvables';
  END IF;
  EXECUTE fixed;
END
$mig$;

DO $mig$
BEGIN
  IF (SELECT count(*) FROM cron.job WHERE jobname = 'purge-cron-run-details') <> 1 THEN
    RAISE EXCEPTION 'Tâche purge-cron-run-details introuvable';
  END IF;
  PERFORM cron.alter_job(
    job_id := (SELECT jobid FROM cron.job WHERE jobname = 'purge-cron-run-details'),
    command := $c$SELECT public.purge_cron_run_details(5000, interval '7 days');$c$);
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-cron-run-details' AND active
                 AND command = $c$SELECT public.purge_cron_run_details(5000, interval '7 days');$c$) THEN
    RAISE EXCEPTION 'Purge de l''historique des tâches non conforme après modification';
  END IF;
END
$mig$;
