-- Batch stats for AdminListings: views, unique views, messages, conversations, applications, last_view_at
CREATE OR REPLACE FUNCTION public.admin_get_listings_stats(p_sit_ids uuid[])
RETURNS TABLE(
  sit_id uuid,
  view_count bigint,
  unique_view_count bigint,
  message_count bigint,
  conversation_count bigint,
  application_count bigint,
  last_view_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  WITH ids AS (SELECT unnest(p_sit_ids) AS sit_id),
  v AS (
    SELECT
      ids.sit_id,
      count(*) FILTER (WHERE ae.id IS NOT NULL)::bigint AS view_count,
      count(DISTINCT coalesce(ae.user_id::text, ae.metadata->>'session_id', ae.metadata->>'ip', ae.id::text))
        FILTER (WHERE ae.id IS NOT NULL)::bigint AS unique_view_count,
      max(ae.created_at) AS last_view_at
    FROM ids
    LEFT JOIN public.analytics_events ae
      ON ae.event_type = 'page_view'
     AND ae.source = '/sits/' || ids.sit_id::text
    GROUP BY ids.sit_id
  ),
  m AS (
    SELECT ids.sit_id,
      count(msg.id)::bigint AS message_count,
      count(DISTINCT c.id)::bigint AS conversation_count
    FROM ids
    LEFT JOIN public.conversations c ON c.sit_id = ids.sit_id
    LEFT JOIN public.messages msg ON msg.conversation_id = c.id AND coalesce(msg.is_system, false) = false
    GROUP BY ids.sit_id
  ),
  a AS (
    SELECT ids.sit_id,
      count(app.id)::bigint AS application_count
    FROM ids
    LEFT JOIN public.applications app ON app.sit_id = ids.sit_id AND app.status NOT IN ('rejected','cancelled')
    GROUP BY ids.sit_id
  )
  SELECT v.sit_id, v.view_count, v.unique_view_count, m.message_count, m.conversation_count, a.application_count, v.last_view_at
  FROM v JOIN m USING (sit_id) JOIN a USING (sit_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_listings_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_listings_stats(uuid[]) TO authenticated;

-- Top traffic sources (referrers) for a single listing
CREATE OR REPLACE FUNCTION public.admin_get_listing_traffic_sources(p_sit_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(
  referrer_host text,
  hits bigint,
  last_hit_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
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
  ORDER BY hits DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_listing_traffic_sources(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_listing_traffic_sources(uuid, integer) TO authenticated;