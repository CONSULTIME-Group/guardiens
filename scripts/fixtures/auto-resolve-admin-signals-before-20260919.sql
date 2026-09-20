-- Close only consecutive-failure nurturing alerts after three recent healthy runs.
-- Existing rules, SECURITY DEFINER, search_path and execute grants are preserved.
-- No reconciliation call here: the existing daily admin cron applies this rule.
CREATE OR REPLACE FUNCTION public.auto_resolve_admin_signals()
 RETURNS TABLE(signal_type text, resolved_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT s.id, s.signal_type, 'auto_resolved_cause_disparue'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND (
        (s.signal_type = 'identity_orphan_documents' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = s.entity_id AND p.identity_document_url IS NOT NULL
        ))
        OR (s.signal_type = 'stale_draft' AND EXISTS (
          SELECT 1 FROM public.sits si
          WHERE si.id = s.entity_id AND si.status <> 'draft'
        ))
        OR (s.signal_type = 'pending_application' AND EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.id = s.entity_id AND a.status <> 'pending'
        ))
        OR (s.signal_type = 'no_applications' AND EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.sit_id = s.entity_id
        ))
        OR (s.signal_type = 'owner_missing_coordinates' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = s.entity_id
            AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        ))
      )
  ), expired AS (
    SELECT s.id, s.signal_type, 'auto_resolved_expire'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND (
        (s.signal_type = 'notification_delivery_failed'
          AND s.detected_at < now() - interval '3 days')
        OR (s.signal_type = 'notification_delivery_failed_burst'
          AND s.detected_at < now() - interval '2 days')
      )
  ), nurturing_recovered AS (
    -- Only the consecutive-failure alert: never expire an incident by age alone.
    SELECT s.id, s.signal_type, 'auto_resolved_nurturing_recovered'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'nurturing_run_anomaly'
      AND s.entity_type = 'cron_run'
      AND s.entity_id = '00000000-0000-0000-0000-000000000000'::uuid
      AND s.metadata->>'trigger' = '3_runs_non_success'
      AND EXISTS (
        SELECT 1
        FROM (
          SELECT started_at, finished_at, status, metrics
          FROM public.cron_run_log
          WHERE edge_name = 'evaluate-journeys'
          ORDER BY started_at DESC, id DESC
          LIMIT 3
        ) r
        HAVING count(*) = 3
          AND bool_and(COALESCE((
            r.status = 'success' AND r.finished_at IS NOT NULL
            AND r.started_at > s.detected_at
            AND r.started_at >= now() - interval '4 hours'
            AND r.metrics->'errors' = '0'::jsonb
            AND r.metrics->'enrolled' BETWEEN '0'::jsonb AND '100'::jsonb
            AND r.metrics->'capped' = 'false'::jsonb
          ), false))
          AND max(r.started_at) >= now() - interval '2 hours'
      )
  ), updated AS (
    UPDATE public.admin_signals s
    SET resolved_at = now(), action_taken = c.reason
    FROM (SELECT * FROM candidates UNION ALL SELECT * FROM expired
          UNION ALL SELECT * FROM nurturing_recovered) c
    WHERE s.id = c.id
    RETURNING s.signal_type
  )
  SELECT u.signal_type, COUNT(*)::integer
  FROM updated u
  GROUP BY u.signal_type;
END;
$function$