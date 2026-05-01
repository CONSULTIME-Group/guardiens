DROP FUNCTION IF EXISTS public.admin_analytics_daily_events(timestamptz, timestamptz, text);

CREATE FUNCTION public.admin_analytics_daily_events(
  _since timestamptz,
  _until timestamptz,
  _role text DEFAULT NULL
)
RETURNS TABLE(
  jour date,
  page_views bigint,
  signup_started bigint,
  signup_completed bigint,
  onboarding_completed bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (e.created_at AT TIME ZONE 'UTC')::date AS jour,
    count(*) FILTER (WHERE e.event_type = 'page_view')::bigint AS page_views,
    count(*) FILTER (WHERE e.event_type = 'signup_started')::bigint AS signup_started,
    count(*) FILTER (WHERE e.event_type = 'signup_completed')::bigint AS signup_completed,
    count(*) FILTER (WHERE e.event_type = 'onboarding_completed')::bigint AS onboarding_completed
  FROM analytics_events e
  WHERE e.created_at >= _since
    AND e.created_at < _until
    AND (
      _role IS NULL OR _role = 'all'
      OR (e.metadata ->> 'role') = _role
    )
  GROUP BY 1
  ORDER BY 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_analytics_daily_events(timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_daily_events(timestamptz, timestamptz, text) TO authenticated;