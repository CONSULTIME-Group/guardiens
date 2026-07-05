
CREATE OR REPLACE FUNCTION public.get_signup_funnel_metrics(p_period_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := now() - (p_period_days || ' days')::interval;
  v_end timestamptz := now();
  v_funnel jsonb;
  v_blocked jsonb;
  v_failed jsonb;
  v_features jsonb;
  v_top numeric;
  v_meter_seen numeric;
  v_generated numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH steps AS (
    SELECT unnest(ARRAY[
      'page_view','signup_started','signup_role_selected','signup_terms_checked',
      'signup_form_submitted','signup_email_confirmed','signup_completed','first_action'
    ]) AS step
  ),
  counts AS (
    SELECT s.step, COALESCE(c.v, 0) AS v
    FROM steps s
    LEFT JOIN LATERAL (
      SELECT CASE
        WHEN s.step = 'first_action' THEN COUNT(DISTINCT user_id)::numeric
        ELSE COUNT(*)::numeric
      END AS v
      FROM analytics_events
      WHERE event_type = s.step
        AND created_at BETWEEN v_start AND v_end
    ) c ON true
  ),
  ordered AS (
    SELECT step, v,
      row_number() OVER () AS rn,
      LAG(v) OVER () AS prev_v,
      FIRST_VALUE(v) OVER () AS top_v
    FROM counts
  )
  SELECT jsonb_agg(jsonb_build_object(
    'step', step,
    'volume', v,
    'conv_prev', CASE WHEN prev_v IS NULL OR prev_v = 0 THEN NULL ELSE v / prev_v END,
    'conv_top', CASE WHEN top_v = 0 THEN NULL ELSE v / top_v END
  ) ORDER BY rn)
  INTO v_funnel
  FROM ordered;

  -- Blocked reasons
  WITH b AS (
    SELECT COALESCE(metadata->>'reason', 'unknown') AS reason, COUNT(*)::numeric AS v
    FROM analytics_events
    WHERE event_type = 'signup_form_blocked'
      AND created_at BETWEEN v_start AND v_end
    GROUP BY 1
  ),
  tot AS (SELECT NULLIF(SUM(v), 0) AS total FROM b)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'reason', reason,
    'volume', v,
    'pct_of_blocked', CASE WHEN (SELECT total FROM tot) IS NULL THEN 0 ELSE v / (SELECT total FROM tot) END
  ) ORDER BY v DESC), '[]'::jsonb)
  INTO v_blocked
  FROM b;

  -- Failed by code
  WITH f AS (
    SELECT COALESCE(metadata->>'code', metadata->>'reason', 'unknown') AS code,
           COUNT(*)::numeric AS v,
           MAX(created_at) AS last_seen
    FROM analytics_events
    WHERE event_type = 'signup_failed'
      AND created_at BETWEEN v_start AND v_end
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'code', code, 'volume', v, 'last_seen', last_seen
  ) ORDER BY v DESC), '[]'::jsonb)
  INTO v_failed
  FROM f;

  -- Features adoption
  SELECT COUNT(*) FILTER (WHERE event_type='signup_password_meter_seen'),
         COUNT(*) FILTER (WHERE event_type='signup_password_generated_used')
  INTO v_meter_seen, v_generated
  FROM analytics_events
  WHERE event_type IN ('signup_password_meter_seen','signup_password_generated_used')
    AND created_at BETWEEN v_start AND v_end;

  v_features := jsonb_build_object(
    'password_meter_seen', v_meter_seen,
    'password_generated_used', v_generated,
    'generated_used_rate', CASE WHEN v_meter_seen = 0 THEN 0 ELSE v_generated / v_meter_seen END,
    'first_shot_strong_rate', NULL
  );

  RETURN jsonb_build_object(
    'period_start', v_start,
    'period_end', v_end,
    'funnel', COALESCE(v_funnel, '[]'::jsonb),
    'blocked_reasons', v_blocked,
    'failed_by_code', v_failed,
    'features', v_features
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_signup_funnel_metrics(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_signup_funnel_metrics(integer) TO authenticated, service_role;
