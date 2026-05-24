CREATE OR REPLACE FUNCTION public.admin_get_sits_stats(p_sit_ids uuid[])
RETURNS TABLE(sit_id uuid, view_count bigint, message_count bigint, conversation_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  WITH ids AS (SELECT unnest(p_sit_ids) AS sid),
  views AS (
    SELECT (regexp_replace(source, '^/sits/', ''))::uuid AS sid, count(*)::bigint AS n
    FROM public.analytics_events
    WHERE event_type = 'page_view'
      AND source = ANY (SELECT '/sits/' || sid::text FROM ids)
    GROUP BY 1
  ),
  msgs AS (
    SELECT c.sit_id AS sid, count(*)::bigint AS n
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE c.sit_id = ANY (p_sit_ids) AND coalesce(m.is_system, false) = false
    GROUP BY c.sit_id
  ),
  convs AS (
    SELECT sit_id AS sid, count(*)::bigint AS n
    FROM public.conversations
    WHERE sit_id = ANY (p_sit_ids)
    GROUP BY sit_id
  )
  SELECT ids.sid,
    COALESCE(views.n, 0),
    COALESCE(msgs.n, 0),
    COALESCE(convs.n, 0)
  FROM ids
  LEFT JOIN views ON views.sid = ids.sid
  LEFT JOIN msgs ON msgs.sid = ids.sid
  LEFT JOIN convs ON convs.sid = ids.sid;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_get_sits_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_sits_stats(uuid[]) TO authenticated;