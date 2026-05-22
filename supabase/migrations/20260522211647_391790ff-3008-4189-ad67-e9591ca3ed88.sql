CREATE OR REPLACE FUNCTION public.get_sit_views_count(p_sit_ids uuid[])
RETURNS TABLE(sit_id uuid, views_30d bigint, views_total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH owned AS (
    SELECT id FROM public.sits
    WHERE id = ANY(p_sit_ids) AND user_id = auth.uid()
  )
  SELECT
    o.id AS sit_id,
    COUNT(*) FILTER (
      WHERE ae.event_type = 'sit_view'
        AND ae.created_at > now() - interval '30 days'
    )::bigint AS views_30d,
    COUNT(*) FILTER (WHERE ae.event_type = 'sit_view')::bigint AS views_total
  FROM owned o
  LEFT JOIN public.analytics_events ae
    ON ae.event_type = 'sit_view'
   AND (ae.metadata->>'sit_id')::uuid = o.id
  GROUP BY o.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_sit_views_count(uuid[]) TO authenticated;