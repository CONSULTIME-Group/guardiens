-- Lot JOURN3 (24/11/2026, conseil du 23/11, decision 3, « ok, fais-le » de
-- Jeremie). Repere : journ3_taches_sql_journalisees.
--
-- Onze taches pg_cron purement SQL ne laissaient aucune trace dans
-- cron_run_log (releve du 23/11 : 13 taches, dont geocode-profiles-backfill,
-- deja journalisee sous le nom geocode-profile-backfill, et la tache
-- enrich-guide-places-osm, desactivee le 23/11). Chacune passe desormais par
-- public.run_logged_cron(nom, commande, battement) :
--   - echec : une ligne « failed » avec le message d'erreur, toujours ;
--   - succes : une ligne « success » a chaque passage, sauf pour les taches
--     plus frequentes que l'heure, qui ecrivent un battement par heure
--     (regle du lot JOURN1).
-- Une erreur de la commande est rattrapee et journalisee : elle n'annule
-- plus que la commande elle-meme. Horaires inchanges. Rejouable : une tache
-- deja enveloppee est laissee telle quelle.

CREATE OR REPLACE FUNCTION public.run_logged_cron(p_name text, p_command text, p_heartbeat_minutes integer DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _started timestamptz := clock_timestamp();
  _cmd text := regexp_replace(coalesce(p_command, ''), '[[:space:];]+$', '');
  _err text;
BEGIN
  BEGIN
    EXECUTE _cmd;
  EXCEPTION WHEN OTHERS THEN
    _err := left(SQLSTATE || ' ' || SQLERRM, 500);
  END;

  IF _err IS NOT NULL THEN
    INSERT INTO public.cron_run_log (edge_name, started_at, finished_at, status, metrics, error_message)
    VALUES (p_name, _started, clock_timestamp(), 'failed',
            jsonb_build_object('kind', 'sql', 'duration_ms', round(extract(epoch FROM clock_timestamp() - _started) * 1000)),
            _err);
    RETURN;
  END IF;

  IF coalesce(p_heartbeat_minutes, 0) <= 0 OR NOT EXISTS (
    SELECT 1 FROM public.cron_run_log
    WHERE edge_name = p_name AND status = 'success'
      AND started_at > now() - make_interval(mins => p_heartbeat_minutes)
  ) THEN
    INSERT INTO public.cron_run_log (edge_name, started_at, finished_at, status, metrics)
    VALUES (p_name, _started, clock_timestamp(), 'success',
            jsonb_build_object('kind', 'sql',
                               'duration_ms', round(extract(epoch FROM clock_timestamp() - _started) * 1000),
                               'heartbeat', coalesce(p_heartbeat_minutes, 0) > 0));
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.run_logged_cron(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_logged_cron(text, text, integer) TO service_role;

DO $$
DECLARE
  r record;
  _hb integer;
BEGIN
  FOR r IN
    SELECT jobid, jobname, command
    FROM cron.job
    WHERE jobname IN (
      'admin-signals-auto-resolve-hourly',
      'auto-archive-past-sits',
      'detect-low-email-delivery',
      'detect-stale-digest-queue',
      'notif-mot-fondateurs-nouveaux-inscrits',
      'outing-reminders',
      'purge-cron-run-details',
      'recalc-seo-city-nearby-counts-daily',
      'recalc-seo-city-page-counts-daily',
      'recalc-seo-department-page-counts-daily',
      'retry-missing-geocoding'
    )
      AND command NOT ILIKE '%run_logged_cron%'
  LOOP
    _hb := CASE WHEN r.jobname IN ('purge-cron-run-details', 'retry-missing-geocoding') THEN 60 ELSE 0 END;
    PERFORM cron.alter_job(
      r.jobid,
      command := format('SELECT public.run_logged_cron(%L, %L, %s);', r.jobname, btrim(r.command), _hb)
    );
  END LOOP;
END $$;
