CREATE OR REPLACE FUNCTION public.admin_analytics_daily_events(_since timestamp with time zone, _until timestamp with time zone, _role text DEFAULT NULL::text)
 RETURNS TABLE(jour date, page_views bigint, signup_started bigint, signup_completed bigint, onboarding_completed bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (e.created_at AT TIME ZONE 'UTC')::date AS jour,
    -- page_view et signup_started n'ont pas de role: on ignore le filtre
    count(*) FILTER (WHERE e.event_type = 'page_view')::bigint AS page_views,
    count(*) FILTER (WHERE e.event_type = 'signup_started')::bigint AS signup_started,
    count(*) FILTER (
      WHERE e.event_type = 'signup_completed'
        AND (_role IS NULL OR _role = 'all' OR (e.metadata ->> 'role') = _role)
    )::bigint AS signup_completed,
    count(*) FILTER (
      WHERE e.event_type = 'onboarding_completed'
        AND (_role IS NULL OR _role = 'all' OR (e.metadata ->> 'role') = _role)
    )::bigint AS onboarding_completed
  FROM analytics_events e
  WHERE e.created_at >= _since
    AND e.created_at < _until
    AND e.event_type IN ('page_view','signup_started','signup_completed','onboarding_completed')
  GROUP BY 1
  ORDER BY 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_analytics_top_sources(_since timestamp with time zone, _until timestamp with time zone, _role text DEFAULT NULL::text, _limit integer DEFAULT 15)
 RETURNS TABLE(path text, views bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- page_view n'a pas de role en metadata: on ignore le filtre _role
  -- (sinon le top sources tombe à 0 dès qu'un rôle est sélectionné)
  RETURN QUERY
  SELECT normalize_analytics_source(e.source) AS path, count(*)::bigint AS views
  FROM analytics_events e
  WHERE e.event_type = 'page_view'
    AND e.created_at >= _since
    AND e.created_at < _until
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT _limit;
END;
$function$;