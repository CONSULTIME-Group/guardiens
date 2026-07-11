CREATE OR REPLACE FUNCTION public.admin_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb := '{}'::jsonb;
  v_money_regex text := '(\d+\s*€|€\s*\d+|\meuros?\M|\mrémunér|\mremuner|\msalaire\M|\mtarif\M|\mpayer\M|\mpaiement\M|\mcash\M|\mespèces?\M)';
  v_health record;
  v_reports_count int; v_reports_avg_days numeric;
  v_missions_money_count int; v_missions_money jsonb;
  v_reviews_pending_count int;
  v_identity_pending_count int;
  v_pros_pending_count int; v_pros_pending jsonb;
  v_pipeline_critical boolean := false; v_pipeline_reasons jsonb := '[]'::jsonb;
  v_mass_paused_count int; v_mass_paused jsonb;
  v_deferred_stuck_count int;
  v_sits_zero_apps_count int; v_sits_zero_apps jsonb;
  v_sits_overdue_count int; v_sits_overdue jsonb;
  v_new_incomplete_count int;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::int, COALESCE(avg(EXTRACT(EPOCH FROM (now() - created_at)) / 86400.0), 0)
    INTO v_reports_count, v_reports_avg_days
  FROM reports WHERE status IN ('new','in_progress');

  WITH m AS (
    SELECT id, title, slug FROM small_missions
    WHERE status = 'open'
      AND (description ~* v_money_regex OR exchange_offer ~* v_money_regex)
    ORDER BY created_at DESC
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'slug',slug)) FILTER (WHERE row_num <= 5), '[]'::jsonb)
    INTO v_missions_money_count, v_missions_money
  FROM (SELECT id, title, slug, row_number() OVER () AS row_num FROM m) x;

  SELECT count(*)::int INTO v_reviews_pending_count
  FROM reviews WHERE moderation_status = 'en_attente';

  SELECT count(*)::int INTO v_identity_pending_count
  FROM profiles WHERE identity_verification_status IN ('pending','submitted');

  WITH p AS (
    SELECT id, declared_business_name, user_id FROM pro_verifications
    WHERE status IN ('pending','needs_review')
    ORDER BY created_at DESC
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(jsonb_build_object('id',id,'name',COALESCE(declared_business_name,''),'user_id',user_id)) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_pros_pending_count, v_pros_pending
  FROM (SELECT id, declared_business_name, user_id, row_number() OVER () AS rn FROM p) x;

  -- Pipeline email : la criticité NE dépend PLUS de last_run_age_seconds.
  -- Le worker est event-driven ; un silence en période calme est normal.
  SELECT * INTO v_health FROM v_email_pipeline_health LIMIT 1;
  IF v_health IS NOT NULL THEN
    IF v_health.oldest_pending_age_seconds IS NOT NULL AND v_health.oldest_pending_age_seconds > 600 THEN
      v_pipeline_critical := true;
      v_pipeline_reasons := v_pipeline_reasons || to_jsonb('Backlog file : plus vieux pending ' || round(v_health.oldest_pending_age_seconds)::text || 's');
    END IF;
    IF COALESCE(v_health.failure_rate_1h,0) > 0.3 AND COALESCE(v_health.attempts_1h,0) >= 10 THEN
      v_pipeline_critical := true;
      v_pipeline_reasons := v_pipeline_reasons || to_jsonb('Taux d''échec ' || round(v_health.failure_rate_1h*100)::text || '% (1h)');
    END IF;
    IF COALESCE(v_health.stuck_rate_limit, false) THEN
      v_pipeline_critical := true;
      v_pipeline_reasons := v_pipeline_reasons || to_jsonb('Rate-limit bloqué'::text);
    END IF;
    IF COALESCE(v_health.dlq_last_hour, 0) > 0 THEN
      v_pipeline_critical := true;
      v_pipeline_reasons := v_pipeline_reasons || to_jsonb('DLQ ' || v_health.dlq_last_hour::text || ' sur 1h');
    END IF;
  END IF;

  WITH me AS (
    SELECT id, subject FROM mass_emails WHERE status = 'paused'
    ORDER BY created_at DESC
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(jsonb_build_object('id',id,'subject',subject)) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_mass_paused_count, v_mass_paused
  FROM (SELECT id, subject, row_number() OVER () AS rn FROM me) x;

  SELECT count(*)::int INTO v_deferred_stuck_count
  FROM email_deferred_queue
  WHERE status = 'pending' AND scheduled_for < now() - interval '1 hour';

  WITH s AS (
    SELECT s.id, s.title, s.slug FROM sits s
    WHERE s.status = 'published'
      AND s.published_at IS NOT NULL
      AND s.published_at < now() - interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.sit_id = s.id)
    ORDER BY s.published_at ASC
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'slug',slug)) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_sits_zero_apps_count, v_sits_zero_apps
  FROM (SELECT id, title, slug, row_number() OVER () AS rn FROM s) x;

  WITH s AS (
    SELECT id, title, end_date FROM sits
    WHERE status = 'confirmed' AND end_date IS NOT NULL AND end_date < CURRENT_DATE
    ORDER BY end_date ASC
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'end_date',end_date)) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_sits_overdue_count, v_sits_overdue
  FROM (SELECT id, title, end_date, row_number() OVER () AS rn FROM s) x;

  SELECT count(*)::int INTO v_new_incomplete_count
  FROM profiles
  WHERE created_at > now() - interval '7 days'
    AND COALESCE(profile_completion,0) < 60;

  v_result := jsonb_build_object(
    'generated_at', now(),
    'reports', jsonb_build_object('count', v_reports_count, 'avg_days', round(v_reports_avg_days,1)),
    'missions_money', jsonb_build_object('count', v_missions_money_count, 'items', v_missions_money),
    'reviews_pending', jsonb_build_object('count', v_reviews_pending_count),
    'identity_pending', jsonb_build_object('count', v_identity_pending_count),
    'pros_pending', jsonb_build_object('count', v_pros_pending_count, 'items', v_pros_pending),
    'email_pipeline', jsonb_build_object('critical', v_pipeline_critical, 'reasons', v_pipeline_reasons),
    'mass_emails_paused', jsonb_build_object('count', v_mass_paused_count, 'items', v_mass_paused),
    'deferred_stuck', jsonb_build_object('count', v_deferred_stuck_count),
    'sits_zero_apps', jsonb_build_object('count', v_sits_zero_apps_count, 'items', v_sits_zero_apps),
    'sits_overdue', jsonb_build_object('count', v_sits_overdue_count, 'items', v_sits_overdue),
    'new_incomplete', jsonb_build_object('count', v_new_incomplete_count)
  );

  RETURN v_result;
END;
$function$;