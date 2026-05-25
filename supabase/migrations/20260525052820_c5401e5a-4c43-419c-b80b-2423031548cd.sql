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
  WITH ids AS (SELECT unnest(p_sit_ids) AS sid)
  SELECT
    ids.sid,
    (SELECT count(*)::bigint FROM public.analytics_events e
       WHERE e.event_type = 'page_view' AND e.source = '/sits/' || ids.sid::text),
    (SELECT count(*)::bigint FROM public.messages m
       JOIN public.conversations c ON c.id = m.conversation_id
       WHERE c.sit_id = ids.sid AND coalesce(m.is_system, false) = false),
    (SELECT count(*)::bigint FROM public.conversations c
       WHERE c.sit_id = ids.sid)
  FROM ids;
END;
$function$;