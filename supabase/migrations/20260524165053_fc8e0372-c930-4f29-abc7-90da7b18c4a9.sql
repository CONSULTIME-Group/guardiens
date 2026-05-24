CREATE OR REPLACE FUNCTION public.admin_get_sit_stats(p_sit_id uuid)
RETURNS TABLE(view_count bigint, message_count bigint, conversation_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.analytics_events
       WHERE event_type = 'page_view' AND source = '/sits/' || p_sit_id::text)::bigint,
    (SELECT count(*) FROM public.messages m
       JOIN public.conversations c ON c.id = m.conversation_id
       WHERE c.sit_id = p_sit_id AND coalesce(m.is_system, false) = false)::bigint,
    (SELECT count(*) FROM public.conversations WHERE sit_id = p_sit_id)::bigint;
END;
$function$;