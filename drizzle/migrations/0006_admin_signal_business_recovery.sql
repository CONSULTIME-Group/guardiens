-- LOT 3, signaux admin : fermeture sur condition metier observable uniquement.
-- Regles existantes strictement inchangees ; cinq regles ajoutees.
-- Aucune fermeture par age, aucune fermeture massive, aucun appel de la fonction ici.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
DO $guard$
BEGIN
  IF md5(pg_get_functiondef('public.auto_resolve_admin_signals()'::regprocedure))
      <> 'afa214b667a88b6860a86433eb7df701' THEN
    RAISE EXCEPTION 'auto_resolve_admin_signals changed since review';
  END IF;
  IF has_function_privilege('anon','public.auto_resolve_admin_signals()','EXECUTE')
      OR has_function_privilege('authenticated','public.auto_resolve_admin_signals()','EXECUTE')
      OR NOT has_function_privilege('service_role','public.auto_resolve_admin_signals()','EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected reconciliation permissions';
  END IF;
END;
$guard$;
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
          WHERE a.id = s.entity_id AND a.status NOT IN ('pending', 'viewed')
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
  ), digest_backlog_recovered AS (
    -- A recent nominal run must prove recovery; age alone never closes a signal.
    SELECT s.id, s.signal_type, 'auto_resolved_digest_backlog_recovered'::text AS reason
    FROM public.admin_signals s
    CROSS JOIN LATERAL (
      SELECT started_at, finished_at, status, metrics, error_message
      FROM public.cron_run_log
      WHERE edge_name = 'send-sitter-daily-digest'
      ORDER BY started_at DESC, id DESC
      LIMIT 1
    ) r
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'digest_queue_morning_backlog'
      AND s.entity_type = 'system'
      AND s.metadata->>'source' = 'sitter-daily-digest'
      AND r.started_at > s.detected_at
      -- Daily reconciliation runs before the next morning digest; tolerate DST.
      AND r.started_at >= now() - interval '26 hours'
      AND r.finished_at BETWEEN r.started_at AND now()
      AND r.status = 'success'
      AND r.error_message IS NULL
      AND r.metrics->'queue_remaining' = '0'::jsonb
      AND (
        -- The early empty-queue return legitimately has no errors/budget fields.
        (r.metrics->>'reason' = 'empty_queue'
          AND r.metrics->'sitters_processed' = '0'::jsonb
          AND (NOT (r.metrics ? 'errors') OR r.metrics->'errors' = '[]'::jsonb)
          AND (NOT (r.metrics ? 'budget_reached') OR r.metrics->'budget_reached' = 'false'::jsonb)
          AND (NOT (r.metrics ? 'queued_today_remaining') OR r.metrics->'queued_today_remaining' = '0'::jsonb)
          AND (NOT (r.metrics ? 'claim_skipped') OR r.metrics->'claim_skipped' = '0'::jsonb))
        OR (NOT (r.metrics ? 'reason')
          AND r.metrics->'errors' = '[]'::jsonb
          AND r.metrics->'budget_reached' = 'false'::jsonb
          AND r.metrics->'queued_today_remaining' = '0'::jsonb
          AND r.metrics->'claim_skipped' = '0'::jsonb)
      )
      -- New arrivals after recovery belong to the next digest, not this incident.
      AND NOT EXISTS (
        SELECT 1 FROM public.sitter_digest_queue q
        WHERE q.status = 'queued'
          AND (q.queued_at IS NULL OR q.queued_at <= r.finished_at)
      )
  ), stale_draft_obsolete AS (
    SELECT s.id, s.signal_type, 'auto_resolved_draft_no_longer_actionable'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL AND s.signal_type = 'stale_draft'
      AND s.entity_type = 'sit'
      AND (
        NOT EXISTS (SELECT 1 FROM public.sits si WHERE si.id = s.entity_id)
        OR EXISTS (
          SELECT 1 FROM public.sits si WHERE si.id = s.entity_id
            AND si.status = 'draft' AND si.start_date IS NOT NULL
            AND COALESCE(si.end_date::date, si.start_date::date) < current_date
        )
      )
  ), discussion_concluded AS (
    SELECT s.id, s.signal_type, 'auto_resolved_application_concluded'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL AND s.signal_type = 'stalled_discussion'
      AND s.entity_type = 'application'
      AND EXISTS (
        SELECT 1 FROM public.applications a WHERE a.id = s.entity_id
          AND a.status IN ('accepted', 'rejected', 'cancelled')
      )
  ), city_coverage_counts AS MATERIALIZED (
    -- Same 30 km geographic rule as the detector, without unrelated SEO cache.
    SELECT s.id, c.total, c.verified
    FROM public.admin_signals s
    JOIN public.seo_city_pages pg ON pg.id = s.entity_id
    CROSS JOIN LATERAL (
      SELECT COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE p.identity_verified IS TRUE)::integer AS verified
      FROM public.profiles p
      WHERE p.role IN ('sitter', 'both')
        AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND 6371 * acos(LEAST(1, GREATEST(-1,
          cos(radians(pg.latitude)) * cos(radians(p.latitude))
            * cos(radians(p.longitude) - radians(pg.longitude))
          + sin(radians(pg.latitude)) * sin(radians(p.latitude))
        ))) <= 30
    ) c
    WHERE s.resolved_at IS NULL AND s.signal_type = 'city_coverage_gap'
      AND s.entity_type = 'city' AND s.metadata->'radius_km' = '30'::jsonb
      AND pg.published IS TRUE
      AND pg.latitude BETWEEN -90 AND 90 AND pg.longitude BETWEEN -180 AND 180
  ), city_coverage_recovered AS (
    SELECT s.id, s.signal_type, 'auto_resolved_city_coverage_recovered'::text AS reason
    FROM public.admin_signals s
    JOIN city_coverage_counts c ON c.id = s.id
    WHERE c.total >= 3
  ), claim_slot_recovered AS (
    -- Starvation ends only when the very digest named in the signal proves,
    -- after detection, a successful run with no refused claim.
    SELECT s.id, s.signal_type, 'auto_resolved_claim_slot_recovered'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'sit_notification_claim_starvation'
      AND s.entity_type = 'system'
      AND s.metadata->>'source' IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.cron_run_log r
        WHERE r.edge_name IN (
            s.metadata->>'source', 'send-' || (s.metadata->>'source'))
          AND r.started_at > s.detected_at
          AND r.status = 'success'
          AND r.finished_at IS NOT NULL
          AND r.error_message IS NULL
          AND (
            r.metrics->'claim_skipped' = '0'::jsonb
            OR r.metrics->>'reason' = 'empty_queue'
          )
      )
  ), owner_sit_confirmed AS (
    -- The nudge targets a published sit still holding an undecided application.
    SELECT s.id, s.signal_type, 'auto_resolved_sit_no_longer_unconfirmed'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'owner_sit_unconfirmed'
      AND s.entity_type = 'sit'
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.sits si
          WHERE si.id = s.entity_id AND si.status = 'published'
        )
        OR NOT EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.sit_id = s.entity_id
            AND a.status IN ('pending', 'viewed', 'discussing')
        )
      )
  ), digest_queue_cleared AS (
    -- An unknown queueing date stays blocking: never assume an empty queue.
    SELECT s.id, s.signal_type, 'auto_resolved_digest_queue_cleared'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'digest_queue_stalled'
      AND NOT EXISTS (
        SELECT 1 FROM public.sitter_digest_queue q
        WHERE q.status = 'queued'
          AND (q.queued_at IS NULL OR q.queued_at < s.detected_at)
      )
  ), dormant_sitter_activated AS (
    -- Exact inverse of detect_dormant_sitters: the sitter applied somewhere,
    -- left the detector population, or the profile no longer exists.
    SELECT s.id, s.signal_type, 'auto_resolved_dormant_sitter_activated'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'dormant_sitter'
      AND s.entity_type = 'profile'
      AND (
        NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.entity_id)
        OR EXISTS (
          SELECT 1 FROM public.applications a WHERE a.sitter_id = s.entity_id
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = s.entity_id
            AND (
              p.role NOT IN ('sitter', 'both')
              OR p.identity_verified IS DISTINCT FROM true
              OR COALESCE(p.profile_completion, 0) < 60
            )
        )
      )
  ), affinity_onboarding_done AS (
    -- Exact inverse of detect_affinity_stale: a completion event exists.
    SELECT s.id, s.signal_type, 'auto_resolved_affinity_onboarding_done'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'affinity_onboarding_stale'
      AND s.entity_type = 'profile'
      AND (
        NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.entity_id)
        OR EXISTS (
          SELECT 1 FROM public.analytics_events e
          WHERE e.user_id = s.entity_id
            AND e.event_type = 'affinity_onboarding_completed'
        )
      )
  ), city_coverage_refreshed AS (
    UPDATE public.admin_signals s
    SET severity = CASE WHEN c.total = 0 THEN 'critical' ELSE 'warning' END,
      metadata = s.metadata || jsonb_build_object(
        'sitters_count', c.total, 'verified_sitters_count', c.verified)
    FROM city_coverage_counts c
    WHERE s.id = c.id AND s.resolved_at IS NULL AND c.total < 3
      AND (s.severity IS DISTINCT FROM CASE WHEN c.total = 0 THEN 'critical' ELSE 'warning' END
        OR s.metadata->'sitters_count' IS DISTINCT FROM to_jsonb(c.total)
        OR s.metadata->'verified_sitters_count' IS DISTINCT FROM to_jsonb(c.verified))
    RETURNING s.id
  ), updated AS (
    UPDATE public.admin_signals s
    SET resolved_at = now(), action_taken = c.reason
    FROM (SELECT * FROM candidates UNION ALL SELECT * FROM expired
          UNION ALL SELECT * FROM nurturing_recovered
          UNION ALL SELECT * FROM digest_backlog_recovered
          UNION ALL SELECT * FROM stale_draft_obsolete
          UNION ALL SELECT * FROM discussion_concluded
          UNION ALL SELECT * FROM city_coverage_recovered
          UNION ALL SELECT * FROM claim_slot_recovered
          UNION ALL SELECT * FROM owner_sit_confirmed
          UNION ALL SELECT * FROM digest_queue_cleared
          UNION ALL SELECT * FROM dormant_sitter_activated
          UNION ALL SELECT * FROM affinity_onboarding_done) c
    WHERE s.id = c.id
    RETURNING s.signal_type
  )
  SELECT u.signal_type, COUNT(*)::integer
  FROM updated u
  GROUP BY u.signal_type;
END;
$function$;
COMMENT ON FUNCTION public.auto_resolve_admin_signals() IS
  'Ferme un signal admin uniquement sur une condition metier observable, jamais par age ni en masse. Les metadonnees sont conservees, action_taken porte la raison. Exclus volontairement de toute fermeture automatique car ils relevent d une revue humaine : suspicious_account, animal_rehoming_listing, identity_needs_review.';
