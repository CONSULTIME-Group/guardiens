CREATE OR REPLACE FUNCTION public.admin_get_listings_stats(p_sit_ids uuid[])
RETURNS TABLE(
  sit_id uuid,
  view_count bigint,
  unique_view_count bigint,
  public_view_count bigint,
  member_view_count bigint,
  unique_member_view_count bigint,
  message_count bigint,
  conversation_count bigint,
  application_count bigint,
  last_view_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  WITH sids AS (
    SELECT unnest(p_sit_ids) AS id
  ),
  ev AS (
    SELECT
      s.id AS event_sit_id,
      e.user_id,
      e.created_at
    FROM sids s
    LEFT JOIN public.analytics_events e
      ON e.event_type = 'page_view'
     AND e.source = '/sits/' || s.id::text
  )
  SELECT
    s.id AS sit_id,
    COUNT(ev.created_at)::bigint AS view_count,
    COUNT(DISTINCT ev.user_id)::bigint AS unique_view_count,
    COUNT(*) FILTER (WHERE ev.created_at IS NOT NULL AND ev.user_id IS NULL)::bigint AS public_view_count,
    COUNT(*) FILTER (WHERE ev.user_id IS NOT NULL)::bigint AS member_view_count,
    COUNT(DISTINCT ev.user_id) FILTER (WHERE ev.user_id IS NOT NULL)::bigint AS unique_member_view_count,
    (SELECT COUNT(*) FROM public.messages m
       JOIN public.conversations c ON c.id = m.conversation_id
       WHERE c.sit_id = s.id AND COALESCE(m.is_system, false) = false)::bigint AS message_count,
    (SELECT COUNT(*) FROM public.conversations conv WHERE conv.sit_id = s.id)::bigint AS conversation_count,
    (SELECT COUNT(*) FROM public.applications app
       WHERE app.sit_id = s.id AND app.status NOT IN ('rejected', 'cancelled'))::bigint AS application_count,
    MAX(ev.created_at) AS last_view_at
  FROM sids s
  LEFT JOIN ev ON ev.event_sit_id = s.id
  GROUP BY s.id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_listings_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_listings_stats(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_listing_traffic_sources(p_sit_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(
  referrer_host text,
  hits bigint,
  last_hit_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN coalesce(ae.metadata->>'referrer', '') = '' THEN '(direct)'
      ELSE coalesce(
        nullif(regexp_replace(ae.metadata->>'referrer', '^https?://([^/]+).*$', '\1'), ''),
        ae.metadata->>'referrer'
      )
    END AS referrer_host,
    count(*)::bigint AS hits,
    max(ae.created_at) AS last_hit_at
  FROM public.analytics_events ae
  WHERE ae.event_type = 'page_view'
    AND ae.source = '/sits/' || p_sit_id::text
  GROUP BY 1
  ORDER BY count(*) DESC, max(ae.created_at) DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_listing_traffic_sources(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_listing_traffic_sources(uuid, integer) TO authenticated;