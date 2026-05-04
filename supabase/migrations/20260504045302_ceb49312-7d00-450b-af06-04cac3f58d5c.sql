
CREATE OR REPLACE FUNCTION public.admin_message_stats(_since timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_total_human bigint;
  v_total_system bigint;
  v_convs_active bigint;
  v_convs_total bigint;
  v_convs_with_reply bigint;
  v_convs_started bigint;
  v_avg_per_active_day numeric;
  v_active_days int;
  v_last_msg_at timestamptz;
  v_by_context jsonb;
  v_daily jsonb;
  v_start timestamptz;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  v_start := COALESCE(_since, '1970-01-01'::timestamptz);

  SELECT
    count(*) FILTER (WHERE NOT is_system),
    count(*) FILTER (WHERE is_system),
    count(DISTINCT conversation_id) FILTER (WHERE NOT is_system),
    count(DISTINCT date_trunc('day', created_at)) FILTER (WHERE NOT is_system),
    max(created_at)
  INTO v_total_human, v_total_system, v_convs_active, v_active_days, v_last_msg_at
  FROM messages
  WHERE created_at >= v_start;

  SELECT count(*) INTO v_convs_total FROM conversations;

  -- Conversations on period with at least 2 distinct senders (= reply happened)
  WITH conv_senders AS (
    SELECT conversation_id, count(DISTINCT sender_id) AS n_senders
    FROM messages
    WHERE created_at >= v_start AND NOT is_system
    GROUP BY conversation_id
  )
  SELECT
    count(*) FILTER (WHERE n_senders >= 2),
    count(*)
  INTO v_convs_with_reply, v_convs_started
  FROM conv_senders;

  v_avg_per_active_day := CASE WHEN v_active_days > 0
    THEN round((v_total_human::numeric / v_active_days)::numeric, 1)
    ELSE 0 END;

  -- Breakdown by context_type (joined from conversations)
  SELECT jsonb_object_agg(ctx, cnt)
  INTO v_by_context
  FROM (
    SELECT COALESCE(c.context_type::text, 'private') AS ctx, count(*) AS cnt
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.created_at >= v_start AND NOT m.is_system
    GROUP BY 1
  ) t;

  -- Daily series, zero-filled for the last 14 calendar days (or full period if smaller)
  WITH bounds AS (
    SELECT
      GREATEST(v_start::date, (CURRENT_DATE - INTERVAL '13 days')::date) AS d_start,
      CURRENT_DATE AS d_end
  ),
  days AS (
    SELECT generate_series(d_start, d_end, INTERVAL '1 day')::date AS d FROM bounds
  ),
  counts AS (
    SELECT date_trunc('day', created_at)::date AS d,
           count(*) FILTER (WHERE NOT is_system) AS human,
           count(*) FILTER (WHERE is_system) AS sys
    FROM messages
    WHERE created_at >= (SELECT d_start FROM bounds)
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'date', to_char(days.d, 'YYYY-MM-DD'),
    'human', COALESCE(counts.human, 0),
    'system', COALESCE(counts.sys, 0)
  ) ORDER BY days.d)
  INTO v_daily
  FROM days LEFT JOIN counts ON counts.d = days.d;

  v_result := jsonb_build_object(
    'total_human', v_total_human,
    'total_system', v_total_system,
    'conversations_active', v_convs_active,
    'conversations_total', v_convs_total,
    'conversations_started_period', v_convs_started,
    'conversations_with_reply', v_convs_with_reply,
    'reply_rate', CASE WHEN v_convs_started > 0
      THEN round((v_convs_with_reply::numeric * 100 / v_convs_started)::numeric, 1)
      ELSE 0 END,
    'active_days', v_active_days,
    'avg_per_active_day', v_avg_per_active_day,
    'last_message_at', v_last_msg_at,
    'by_context', COALESCE(v_by_context, '{}'::jsonb),
    'daily', COALESCE(v_daily, '[]'::jsonb)
  );

  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.admin_message_stats(timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_message_stats(timestamptz) TO authenticated;
