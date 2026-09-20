-- Passe RLS/RPC residuelle du 20/09/2026.
-- Regle permanente : une vue du schema public est en lecture seule cote client.
-- Aucun role anon ou authenticated ne detient INSERT, UPDATE, DELETE, TRUNCATE,
-- REFERENCES ou TRIGGER sur une vue. Les vues heritent sinon des droits par
-- defaut et deviennent modifiables via PostgREST (cas public_profiles).
-- Sauvegardes des droits d'origine : _backup_view_grants_20260920 et
-- _backup_fn_acl_20260920. SQL idempotent, rejouable sans effet de bord.

DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated, PUBLIC',
      v.table_name
    );
  END LOOP;
END $$;

-- Fonctions SECURITY DEFINER qui ecrivent sans controle d'identite et ne sont
-- appelees par aucun code navigateur : reservees au service role.
-- calculate_profile_completion reste accessible a authenticated (appel src/).
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'check_content_quality',
        'claim_mission_event',
        'detect_low_email_delivery',
        'detect_stale_digest_queue',
        'purge_cron_run_details',
        'recalc_seo_city_nearby_counts',
        'recalc_seo_city_page_counts',
        'recalc_seo_department_page_counts',
        'reconcile_email_click_events',
        'refresh_sitter_reply_stats',
        'retry_missing_geocoding',
        'increment_cp_relance',
        'increment_photo_analysis_quota',
        'recalc_completed_sits_count',
        'recalculate_cancellations',
        'recalculate_completed_sits',
        'increment_redirect_hit'
      ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
