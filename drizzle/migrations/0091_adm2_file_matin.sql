-- Lot ADM2 (18/10/2026, audit global de l'espace admin) : file, email du
-- matin et accueil qui disent vrai.
-- 1. auto_resolve_admin_signals ferme aussi :
--    - alma_contact_request quand le message lié est fermé, ou répondu avec un
--      email contact-reply parti (un « répondu » sans envoi reste ouvert) ;
--    - no_applications quand l'annonce n'est plus publiée ;
--    - listing_proximity_large_broadcast quand l'annonce n'est plus publiée ou
--      que la garde a commencé.
--    Base : 0088 (identique à la production le 18/10/2026, md5 c92ebbb8).
-- 2. detect_stale_sits : annonce sans candidature 48 h après sa publication
--    (published_at), au lieu de 3 jours après sa création (décision de
--    Jérémie du 18/10/2026, promesse « premières candidatures sous 24 h »).
-- 3. admin_cron_health suit l'email admin du matin (alert-admin-signals).
--    Base : 0089 (identique à la production le 18/10/2026, md5 5d3b1c99).
-- 4. admin_human_queues : files où un membre attend une réponse humaine,
--    mêmes définitions que admin_menu_badges, lisible par service_role seul
--    (l'email du matin les place en tête).
-- 5. Planification : l'email du matin part de sa propre tâche à 05:35 UTC ;
--    l'appel caché dans daily-admin-activity-analysis est retiré.
-- Rejouable.
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
          SELECT 1 FROM public.profiles p WHERE p.id = s.entity_id AND p.identity_document_url IS NOT NULL))
        OR (s.signal_type = 'stale_draft' AND EXISTS (
          SELECT 1 FROM public.sits si WHERE si.id = s.entity_id AND si.status <> 'draft'))
        OR (s.signal_type = 'pending_application' AND EXISTS (
          SELECT 1 FROM public.applications a WHERE a.id = s.entity_id AND a.status NOT IN ('pending', 'viewed')))
        OR (s.signal_type = 'no_applications' AND EXISTS (
          SELECT 1 FROM public.applications a WHERE a.sit_id = s.entity_id))
        OR (s.signal_type = 'owner_missing_coordinates' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = s.entity_id
            AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL))
      )
  ), expired AS (
    SELECT s.id, s.signal_type, 'auto_resolved_expire'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND ((s.signal_type = 'notification_delivery_failed' AND s.detected_at < now() - interval '3 days')
        OR (s.signal_type = 'notification_delivery_failed_burst' AND s.detected_at < now() - interval '2 days'))
  ), nurturing_recovered AS (
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
  ), nurturing_single_run_recovered AS (
    -- S1 : anomalie ponctuelle close dès que le dernier passage terminé, postérieur, est sain.
    SELECT s.id, s.signal_type, 'auto_resolved_nurturing_next_run_healthy'::text AS reason
    FROM public.admin_signals s
    CROSS JOIN LATERAL (
      SELECT started_at, status, metrics
      FROM public.cron_run_log
      WHERE edge_name = 'evaluate-journeys' AND finished_at IS NOT NULL
      ORDER BY started_at DESC, id DESC
      LIMIT 1
    ) r
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'nurturing_run_anomaly'
      AND COALESCE(s.metadata->>'trigger', '') <> '3_runs_non_success'
      AND r.started_at > s.detected_at
      AND r.status = 'success'
      AND r.metrics->'errors' = '0'::jsonb
      AND r.metrics->'enrolled' BETWEEN '0'::jsonb AND '100'::jsonb
  ), digest_backlog_recovered AS (
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
      AND r.started_at >= now() - interval '26 hours'
      AND r.finished_at BETWEEN r.started_at AND now()
      AND r.status = 'success'
      AND r.error_message IS NULL
      AND r.metrics->'queue_remaining' = '0'::jsonb
      AND (
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
      AND NOT EXISTS (
        SELECT 1 FROM public.sitter_digest_queue q
        WHERE q.status = 'queued' AND (q.queued_at IS NULL OR q.queued_at <= r.finished_at)
      )
  ), stale_draft_obsolete AS (
    -- S1 : supprimée, dates passées, ou déjà publiée une fois (retrait assumé).
    SELECT s.id, s.signal_type, 'auto_resolved_draft_no_longer_actionable'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL AND s.signal_type = 'stale_draft'
      AND s.entity_type = 'sit'
      AND (
        NOT EXISTS (SELECT 1 FROM public.sits si WHERE si.id = s.entity_id)
        OR EXISTS (
          SELECT 1 FROM public.sits si WHERE si.id = s.entity_id
            AND si.status = 'draft'
            AND ((si.start_date IS NOT NULL
                  AND COALESCE(si.end_date::date, si.start_date::date) < current_date)
              OR si.published_at IS NOT NULL
              OR si.unpublished_at IS NOT NULL
              OR si.last_unpublished_reason IS NOT NULL)
        )
      )
  ), pending_application_sit_closed AS (
    -- S1 : candidature disparue, ou annonce qui n'est plus ouverte.
    SELECT s.id, s.signal_type, 'auto_resolved_application_no_longer_open'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL AND s.signal_type = 'pending_application'
      AND (
        NOT EXISTS (SELECT 1 FROM public.applications a WHERE a.id = s.entity_id)
        OR EXISTS (
          SELECT 1 FROM public.applications a JOIN public.sits si ON si.id = a.sit_id
          WHERE a.id = s.entity_id
            AND (si.status NOT IN ('published', 'confirmed', 'in_progress')
              OR COALESCE(si.end_date::date, si.start_date::date) < current_date - 7)
        )
      )
  ), discussion_concluded AS (
    SELECT s.id, s.signal_type, 'auto_resolved_application_concluded'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL AND s.signal_type = 'stalled_discussion'
      AND s.entity_type = 'application'
      AND EXISTS (
        SELECT 1 FROM public.applications a WHERE a.id = s.entity_id
          AND a.status IN ('accepted', 'rejected', 'cancelled'))
  ), discussion_sit_settled AS (
    -- S1 : annonce confirmée, annulée, expirée, archivée ou dépubliée.
    SELECT s.id, s.signal_type, 'auto_resolved_sit_settled'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL AND s.signal_type = 'stalled_discussion'
      AND (
        NOT EXISTS (SELECT 1 FROM public.applications a WHERE a.id = s.entity_id)
        OR EXISTS (
          SELECT 1 FROM public.applications a JOIN public.sits si ON si.id = a.sit_id
          WHERE a.id = s.entity_id AND si.status <> 'published')
      )
  ), city_coverage_counts AS MATERIALIZED (
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
    SELECT s.id, s.signal_type, 'auto_resolved_claim_slot_recovered'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'sit_notification_claim_starvation'
      AND s.entity_type = 'system'
      AND s.metadata->>'source' IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.cron_run_log r
        WHERE r.edge_name IN (s.metadata->>'source', 'send-' || (s.metadata->>'source'))
          AND r.started_at > s.detected_at
          AND r.status = 'success'
          AND r.finished_at IS NOT NULL
          AND r.error_message IS NULL
          AND (r.metrics->'claim_skipped' = '0'::jsonb OR r.metrics->>'reason' = 'empty_queue')
      )
  ), owner_sit_confirmed AS (
    SELECT s.id, s.signal_type, 'auto_resolved_sit_no_longer_unconfirmed'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'owner_sit_unconfirmed'
      AND s.entity_type = 'sit'
      AND (
        NOT EXISTS (SELECT 1 FROM public.sits si WHERE si.id = s.entity_id AND si.status = 'published')
        OR NOT EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.sit_id = s.entity_id AND a.status IN ('pending', 'viewed', 'discussing'))
      )
  ), digest_queue_cleared AS (
    SELECT s.id, s.signal_type, 'auto_resolved_digest_queue_cleared'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'digest_queue_stalled'
      AND NOT EXISTS (
        SELECT 1 FROM public.sitter_digest_queue q
        WHERE q.status = 'queued' AND (q.queued_at IS NULL OR q.queued_at < s.detected_at))
  ), dormant_sitter_activated AS (
    SELECT s.id, s.signal_type, 'auto_resolved_dormant_sitter_activated'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'dormant_sitter'
      AND s.entity_type = 'profile'
      AND (
        NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.entity_id)
        OR EXISTS (SELECT 1 FROM public.applications a WHERE a.sitter_id = s.entity_id)
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = s.entity_id
            AND (p.role NOT IN ('sitter', 'both')
              OR p.identity_verified IS DISTINCT FROM true
              OR COALESCE(p.profile_completion, 0) < 60))
      )
  ), affinity_onboarding_done AS (
    SELECT s.id, s.signal_type, 'auto_resolved_affinity_onboarding_done'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'affinity_onboarding_stale'
      AND s.entity_type = 'profile'
      AND (
        NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.entity_id)
        OR EXISTS (
          SELECT 1 FROM public.analytics_events e
          WHERE e.user_id = s.entity_id AND e.event_type = 'affinity_onboarding_completed')
      )
  ), sit_started AS (
    -- Lot ADM1 : une garde commencée (jour de Paris) ne demande plus d'action
    -- avant le départ. Candidatures, discussions, confirmation et annonce sans
    -- candidature sortent de la file le lendemain du début de garde.
    SELECT s.id, s.signal_type, 'auto_resolved_sit_started'::text AS reason
    FROM public.admin_signals s
    LEFT JOIN public.applications a
      ON s.entity_type = 'application' AND a.id = s.entity_id
    JOIN public.sits si ON si.id = COALESCE(
      CASE WHEN s.metadata->>'sit_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (s.metadata->>'sit_id')::uuid END,
      CASE WHEN s.entity_type = 'sit' THEN s.entity_id END,
      a.sit_id)
    WHERE s.resolved_at IS NULL
      AND s.signal_type IN ('pending_application', 'stalled_discussion', 'owner_sit_unconfirmed', 'no_applications')
      AND si.start_date IS NOT NULL
      AND si.start_date::date < (now() AT TIME ZONE 'Europe/Paris')::date
  ), alma_contact_answered AS (
    -- Lot ADM2 : la demande écrite depuis Alma est close quand le message de
    -- contact lié est fermé, ou marqué répondu AVEC un email de réponse parti.
    -- Un « répondu » sans envoi tracé laisse le signal ouvert.
    SELECT s.id, s.signal_type, 'auto_resolved_contact_answered'::text AS reason
    FROM public.admin_signals s
    JOIN public.contact_messages c
      ON s.metadata->>'contact_message_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND c.id = (s.metadata->>'contact_message_id')::uuid
    WHERE s.resolved_at IS NULL
      AND s.signal_type = 'alma_contact_request'
      AND (c.status = 'closed'
        OR (c.status = 'replied' AND EXISTS (
          SELECT 1 FROM public.email_send_log e
          WHERE e.template_name = 'contact-reply'
            AND lower(e.recipient_email) = lower(c.email)
            AND e.created_at >= c.created_at
            AND e.status = 'sent')))
  ), no_applications_sit_closed AS (
    -- Lot ADM2 : annonce supprimée ou qui n'est plus publiée.
    SELECT s.id, s.signal_type, 'auto_resolved_sit_no_longer_published'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL AND s.signal_type = 'no_applications'
      AND s.entity_type = 'sit'
      AND NOT EXISTS (
        SELECT 1 FROM public.sits si WHERE si.id = s.entity_id AND si.status = 'published')
  ), broadcast_sit_settled AS (
    -- Lot ADM2 : diffusion large d'une annonce qui n'est plus publiée ou dont la garde a commencé.
    SELECT s.id, s.signal_type, 'auto_resolved_broadcast_sit_settled'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL AND s.signal_type = 'listing_proximity_large_broadcast'
      AND s.metadata->>'sit_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND NOT EXISTS (
        SELECT 1 FROM public.sits si
        WHERE si.id = (s.metadata->>'sit_id')::uuid
          AND si.status = 'published'
          AND (si.start_date IS NULL
            OR si.start_date::date >= (now() AT TIME ZONE 'Europe/Paris')::date))
  ), city_coverage_refreshed AS (
    -- S1 : toujours warning, seuls les compteurs sont rafraîchis.
    UPDATE public.admin_signals s
    SET severity = 'warning',
      metadata = s.metadata || jsonb_build_object(
        'sitters_count', c.total, 'verified_sitters_count', c.verified)
    FROM city_coverage_counts c
    WHERE s.id = c.id AND s.resolved_at IS NULL AND c.total < 3
      AND (s.severity IS DISTINCT FROM 'warning'
        OR s.metadata->'sitters_count' IS DISTINCT FROM to_jsonb(c.total)
        OR s.metadata->'verified_sitters_count' IS DISTINCT FROM to_jsonb(c.verified))
    RETURNING s.id
  ), updated AS (
    UPDATE public.admin_signals s
    SET resolved_at = now(), action_taken = c.reason
    FROM (SELECT DISTINCT ON (u.id) u.* FROM (
          SELECT * FROM candidates UNION ALL SELECT * FROM expired
          UNION ALL SELECT * FROM nurturing_recovered
          UNION ALL SELECT * FROM nurturing_single_run_recovered
          UNION ALL SELECT * FROM digest_backlog_recovered
          UNION ALL SELECT * FROM stale_draft_obsolete
          UNION ALL SELECT * FROM pending_application_sit_closed
          UNION ALL SELECT * FROM discussion_concluded
          UNION ALL SELECT * FROM discussion_sit_settled
          UNION ALL SELECT * FROM city_coverage_recovered
          UNION ALL SELECT * FROM claim_slot_recovered
          UNION ALL SELECT * FROM owner_sit_confirmed
          UNION ALL SELECT * FROM digest_queue_cleared
          UNION ALL SELECT * FROM dormant_sitter_activated
          UNION ALL SELECT * FROM affinity_onboarding_done
          UNION ALL SELECT * FROM sit_started
          UNION ALL SELECT * FROM alma_contact_answered
          UNION ALL SELECT * FROM no_applications_sit_closed
          UNION ALL SELECT * FROM broadcast_sit_settled) u
          ORDER BY u.id) c
    WHERE s.id = c.id
    RETURNING s.signal_type
  )
  SELECT u.signal_type, COUNT(*)::integer
  FROM updated u
  GROUP BY u.signal_type;
END;
$function$;
REVOKE ALL ON FUNCTION public.auto_resolve_admin_signals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_resolve_admin_signals() TO service_role;

CREATE OR REPLACE FUNCTION public.detect_stale_sits()
 RETURNS TABLE(sit_id uuid, owner_id uuid, sit_title text, sit_city text, latitude double precision, longitude double precision, days_since_published integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id,
    s.user_id AS owner_id,
    s.title,
    s.city,
    p.latitude,
    p.longitude,
    EXTRACT(day FROM now() - COALESCE(s.published_at, s.created_at))::integer AS days_since_published
  FROM public.sits s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.applications a ON a.sit_id = s.id
  WHERE s.status = 'published'
    AND COALESCE(s.published_at, s.created_at) < now() - interval '48 hours'
  GROUP BY s.id, p.latitude, p.longitude
  HAVING COUNT(a.id) = 0;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cron_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;

  WITH crons(edge_name, expected_interval_min, label) AS (
    VALUES
      ('detect-deploy-and-mark-dirty', 10, 'Détection des déploiements SEO'),
      ('consume-seo-dirty', 15, 'Consommation du flag SEO'),
      ('notify-sitters-on-publish', 15, 'Alerte gardiens à la publication'),
      ('dispatch-web-push', 15, 'Distribution des notifications push'),
      ('evaluate-journeys', 60, 'Évaluation des parcours'),
      ('auto-transition-sits', 60, 'Transitions de statut de garde'),
      ('send-mission-nudges', 60, 'Relances missions d''entraide'),
      ('nudge-suspicious-accounts', 240, 'Détection comptes suspects'),
      ('close-orphan-applications', 1440, 'Clôture des candidatures orphelines'),
      ('publish-stale-reviews', 1440, 'Publication des avis en attente'),
      ('auto-close-small-missions', 1440, 'Clôture des missions d''entraide'),
      ('purge-identity-documents', 1440, 'Purge des pièces d''identité'),
      ('nudge-stale-draft', 1440, 'Relance brouillons dormants'),
      ('send-sitter-daily-digest', 1440, 'Digest quotidien gardiens'),
      ('nudge-affinity-onboarding', 1440, 'Relance onboarding affinité'),
      ('nudge-owner-no-applications', 1440, 'Relance annonces sans candidature'),
      ('nudge-owner-pending-application', 960, 'Relance candidatures en attente'),
      ('nudge-owner-unconfirmed-sit', 1440, 'Relance annonces non confirmées'),
      ('nudge-sitter-dormant', 10080, 'Relance gardiens dormants'),
      ('nudge-verification-stale', 10080, 'Relance vérifications d''identité'),
      ('send-sit-reminders', 1440, 'Rappels in-app avant/après garde'),
      ('send-rappel-j7', 1440, 'Email rappel J-7 avant garde'),
      ('send-rappel-j48', 1440, 'Email rappel J-48h avant garde'),
      ('send-avis-j1', 1440, 'Email relance avis J+1'),
      ('send-avis-j5', 1440, 'Email relance avis J+5'),
      ('send-avis-j10', 1440, 'Email relance avis J+10'),
      ('send-avis-j20', 1440, 'Email relance avis J+20'),
      ('remind-unread-messages', 1440, 'Relance messages non lus (24h)'),
      ('check-content-quality', 10080, 'Détecteur de défauts de contenu'),
      ('send-weekly-nearby-digest', 10080, 'Digest hebdo à proximité'),
      ('send-mutual-aid-weekly-digest', 10080, 'Digest hebdo entraide'),
      ('nudge-untapped-cities', 10080, 'Relance villes sans activité'),
      ('nudge-dormant-top-sitters', 10080, 'Relance meilleurs gardiens dormants'),
      ('nudge-repeated-cancellations', 10080, 'Détection annulations répétées'),
      ('nudge-repeated-republished-sits', 10080, 'Détection republications répétées'),
      ('alert-admin-signals', 1440, 'Email admin du matin')
  ),
  push_backlog AS (
    SELECT count(*) AS waiting
    FROM public.push_delivery_jobs
    WHERE status = 'pending' AND available_at <= now() - interval '15 minutes'
      AND expires_at > now()
  ),
  last_runs AS (
    SELECT DISTINCT ON (edge_name) edge_name, started_at, finished_at, status, error_message
    FROM public.cron_run_log ORDER BY edge_name, started_at DESC
  ),
  recent_stats AS (
    SELECT edge_name,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days') AS runs_7d,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days' AND status = 'failed') AS failed_7d,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days' AND status = 'partial') AS partial_7d
    FROM public.cron_run_log GROUP BY edge_name
  ),
  last_3 AS (
    SELECT edge_name, COUNT(*) FILTER (WHERE status = 'failed') AS failed_in_last_3
    FROM (SELECT edge_name, status,
            ROW_NUMBER() OVER (PARTITION BY edge_name ORDER BY started_at DESC) AS rn
          FROM public.cron_run_log WHERE finished_at IS NOT NULL) t
    WHERE rn <= 3 GROUP BY edge_name
  ),
  evaluated AS (
    SELECT c.edge_name, c.label, c.expected_interval_min,
      lr.started_at, lr.finished_at, lr.status AS last_status, lr.error_message,
      rs.runs_7d, rs.failed_7d, rs.partial_7d, l3.failed_in_last_3,
      CASE
        WHEN c.edge_name = 'dispatch-web-push' THEN
          CASE
            WHEN (SELECT waiting FROM push_backlog) > 0
                 AND (lr.started_at IS NULL
                      OR lr.started_at < now() - (c.expected_interval_min * 2 || ' minutes')::interval)
              THEN 'critical'
            WHEN COALESCE(rs.failed_7d, 0) >= 1 OR COALESCE(rs.partial_7d, 0) >= 1 THEN 'degraded'
            ELSE 'ok'
          END
        WHEN lr.started_at IS NULL
             OR lr.started_at < now() - (c.expected_interval_min * 2 || ' minutes')::interval
          THEN 'critical'
        WHEN COALESCE(rs.failed_7d, 0) >= 1 OR COALESCE(rs.partial_7d, 0) >= 1 THEN 'degraded'
        ELSE 'ok'
      END AS state
    FROM crons c
    LEFT JOIN last_runs lr ON lr.edge_name = c.edge_name
    LEFT JOIN recent_stats rs ON rs.edge_name = c.edge_name
    LEFT JOIN last_3 l3 ON l3.edge_name = c.edge_name
    -- Lot CRON1 : une tâche dont toutes les planifications sont désactivées
    -- (cron.job.active = false) n'est plus évaluée ; sans planification
    -- trouvée, elle reste évaluée (critique si elle ne tourne pas).
    WHERE NOT (
      EXISTS (SELECT 1 FROM cron.job j WHERE j.command LIKE '%/functions/v1/' || c.edge_name || '''%')
      AND NOT EXISTS (SELECT 1 FROM cron.job j WHERE j.active AND j.command LIKE '%/functions/v1/' || c.edge_name || '''%')
    )
  )
  SELECT jsonb_agg(jsonb_build_object(
    'edge_name', e.edge_name, 'label', e.label,
    'expected_interval_min', e.expected_interval_min,
    'last_started_at', e.started_at, 'last_finished_at', e.finished_at,
    'last_status', e.last_status, 'last_error', e.error_message,
    'age_minutes', CASE WHEN e.started_at IS NULL THEN NULL
                        ELSE GREATEST(0, EXTRACT(EPOCH FROM (now() - e.started_at)) / 60)::int END,
    'runs_7d', COALESCE(e.runs_7d, 0), 'failed_7d', COALESCE(e.failed_7d, 0),
    'partial_7d', COALESCE(e.partial_7d, 0),
    'failed_in_last_3', COALESCE(e.failed_in_last_3, 0),
    'state', e.state
  ) ORDER BY CASE e.state WHEN 'critical' THEN 0 WHEN 'degraded' THEN 1 ELSE 2 END, e.label)
  INTO result FROM evaluated e;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_cron_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cron_health() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_human_queues()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_array(
    (SELECT jsonb_build_object('key', 'contactMessages', 'count', count(*), 'oldest', min(created_at))
       FROM contact_messages WHERE status IN ('new', 'en_cours')),
    (SELECT jsonb_build_object('key', 'reports', 'count', count(*), 'oldest', min(created_at))
       FROM reports WHERE status IN ('new', 'in_progress')),
    (SELECT jsonb_build_object('key', 'deletionRequests', 'count', count(*), 'oldest', min(requested_at))
       FROM account_deletion_requests WHERE status = 'pending'),
    (SELECT jsonb_build_object('key', 'reviewDisputes', 'count', count(*), 'oldest', min(created_at))
       FROM review_disputes WHERE status = 'pending'),
    (SELECT jsonb_build_object('key', 'verifications', 'count', count(*), 'oldest', NULL)
       FROM profiles
       WHERE identity_verification_status IN ('pending', 'needs_review')
          OR (identity_verification_status = 'not_submitted'
              AND (identity_document_url IS NOT NULL OR identity_selfie_url IS NOT NULL)))
  );
$function$;
REVOKE ALL ON FUNCTION public.admin_human_queues() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_human_queues() TO service_role;

SELECT cron.schedule(
  'daily-admin-activity-analysis',
  '30 5 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/admin-activity-analysis',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{"mode":"refresh"}'::jsonb
  );
  $cmd$
);

SELECT cron.schedule(
  'alert-admin-signals-daily',
  '35 5 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/alert-admin-signals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 50000
  );
  $cmd$
);
