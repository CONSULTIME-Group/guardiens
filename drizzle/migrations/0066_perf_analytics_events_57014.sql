CREATE INDEX IF NOT EXISTS analytics_events_sit_view_sit_idx
  ON public.analytics_events ((metadata->>'sit_id'), created_at)
  WHERE event_type = 'sit_view';
CREATE INDEX IF NOT EXISTS analytics_events_type_user_created_idx
  ON public.analytics_events (event_type, user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_sit_views_count(p_sit_ids uuid[])
 RETURNS TABLE(sit_id uuid, views_30d bigint, views_total bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  -- Jointure en texte : une metadata mal formée ne casse plus la lecture et
  -- l'index partiel analytics_events_sit_view_sit_idx est utilisable.
  WITH owned AS (
    SELECT id FROM public.sits
    WHERE id = ANY(p_sit_ids) AND user_id = auth.uid()
  )
  SELECT o.id AS sit_id,
    COUNT(ae.created_at) FILTER (WHERE ae.created_at > now() - interval '30 days')::bigint AS views_30d,
    COUNT(ae.created_at)::bigint AS views_total
  FROM owned o
  LEFT JOIN public.analytics_events ae
    ON ae.event_type = 'sit_view'
   AND ae.metadata->>'sit_id' = o.id::text
  GROUP BY o.id;
$function$;

ALTER POLICY "Admins can view all events" ON public.analytics_events
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));
ALTER POLICY "Users can view their own events" ON public.analytics_events
  USING ((SELECT auth.uid()) = user_id);