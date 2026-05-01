-- Helper: normalize a source path (UUID -> :id, dynamic segments -> :slug/:id)
CREATE OR REPLACE FUNCTION public.normalize_analytics_source(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  p text;
BEGIN
  IF raw IS NULL THEN
    RETURN '(autres / inconnu)';
  END IF;
  p := trim(raw);
  IF p = '' THEN
    RETURN '(autres / inconnu)';
  END IF;
  p := split_part(split_part(p, '?', 1), '#', 1);
  IF p = '' THEN
    RETURN '(autres / inconnu)';
  END IF;
  IF p ~* '^https?://' THEN
    -- best-effort: extract path after scheme://host
    p := regexp_replace(p, '^https?://[^/]+', '');
    IF p = '' THEN p := '/'; END IF;
  END IF;
  IF left(p, 1) <> '/' THEN
    RETURN p;
  END IF;
  IF length(p) > 1 AND right(p, 1) = '/' THEN
    p := left(p, length(p) - 1);
  END IF;

  -- dynamic patterns
  IF p ~ '^/gardiens/.+' THEN RETURN '/gardiens/:id'; END IF;
  IF p ~ '^/proprietaires?/.+' THEN RETURN '/proprietaires/:id'; END IF;
  IF p ~ '^/profil/.+' THEN RETURN '/profil/:id'; END IF;
  IF p ~ '^/annonces/.+' THEN RETURN '/annonces/:id'; END IF;
  IF p ~ '^/sits/.+' THEN RETURN '/sits/:id'; END IF;
  IF p ~ '^/missions/.+' THEN RETURN '/missions/:id'; END IF;
  IF p ~ '^/petites-missions/.+' THEN RETURN '/petites-missions/:id'; END IF;
  IF p ~ '^/messages/.+' THEN RETURN '/messages/:id'; END IF;
  IF p ~ '^/conversation/.+' THEN RETURN '/conversation/:id'; END IF;
  IF p ~ '^/guides/.+' THEN RETURN '/guides/:slug'; END IF;
  IF p ~ '^/actualites/.+' THEN RETURN '/actualites/:slug'; END IF;
  IF p ~ '^/articles/.+' THEN RETURN '/articles/:slug'; END IF;
  IF p ~ '^/villes?/.+' THEN RETURN '/villes/:slug'; END IF;
  IF p ~ '^/departements?/.+' THEN RETURN '/departements/:slug'; END IF;
  IF p ~ '^/avis/.+' THEN RETURN '/avis/:id'; END IF;

  -- residual UUID
  IF p ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    RETURN regexp_replace(p, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', ':id', 'gi');
  END IF;

  RETURN p;
END;
$$;

-- Counts of events by type (with optional role filter via metadata.role)
CREATE OR REPLACE FUNCTION public.admin_analytics_event_counts(
  _since timestamptz,
  _until timestamptz,
  _role text DEFAULT NULL
)
RETURNS TABLE(event_type text, cnt bigint)
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
  SELECT e.event_type, count(*)::bigint
  FROM analytics_events e
  WHERE e.created_at >= _since
    AND e.created_at < _until
    AND (
      _role IS NULL
      OR _role = 'all'
      OR (e.metadata ->> 'role') = _role
    )
  GROUP BY e.event_type;
END;
$$;

-- Daily aggregates (page_views, signup_started, signup_completed+onboarding_completed)
CREATE OR REPLACE FUNCTION public.admin_analytics_daily_events(
  _since timestamptz,
  _until timestamptz,
  _role text DEFAULT NULL
)
RETURNS TABLE(jour date, page_views bigint, signup_started bigint, signup_completed bigint)
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
    count(*) FILTER (WHERE e.event_type = 'signup_completed')::bigint AS signup_completed
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

-- Top sources for page_view events, normalized
CREATE OR REPLACE FUNCTION public.admin_analytics_top_sources(
  _since timestamptz,
  _until timestamptz,
  _role text DEFAULT NULL,
  _limit int DEFAULT 15
)
RETURNS TABLE(path text, views bigint)
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
  SELECT normalize_analytics_source(e.source) AS path, count(*)::bigint AS views
  FROM analytics_events e
  WHERE e.event_type = 'page_view'
    AND e.created_at >= _since
    AND e.created_at < _until
    AND (
      _role IS NULL OR _role = 'all'
      OR (e.metadata ->> 'role') = _role
    )
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT _limit;
END;
$$;

-- Role breakdown for funnel comparison
CREATE OR REPLACE FUNCTION public.admin_analytics_role_breakdown(
  _since timestamptz,
  _until timestamptz
)
RETURNS TABLE(role text, event_type text, cnt bigint)
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
    (e.metadata ->> 'role') AS role,
    e.event_type,
    count(*)::bigint
  FROM analytics_events e
  WHERE e.created_at >= _since
    AND e.created_at < _until
    AND (e.metadata ->> 'role') IN ('owner', 'sitter', 'both')
  GROUP BY 1, 2;
END;
$$;