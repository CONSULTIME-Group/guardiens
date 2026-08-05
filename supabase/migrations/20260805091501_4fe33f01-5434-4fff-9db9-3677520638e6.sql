-- 1. Volume d'audience d'une publication d'entraide, calculé avant publication.
CREATE OR REPLACE FUNCTION public.count_mission_notification_audience(
  p_lat double precision,
  p_lng double precision,
  p_radius_km integer DEFAULT 30
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.profiles p
  LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
  LEFT JOIN public.suppressed_emails se ON lower(se.email) = lower(p.email)
  WHERE p_lat IS NOT NULL
    AND p_lng IS NOT NULL
    AND p.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND p.email IS NOT NULL
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND COALESCE(p.profile_completion, 0) >= 40
    AND COALESCE(ep.new_mission_digest, true) = true
    AND COALESCE(ep.product_emails, true) = true
    AND se.email IS NULL
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(p.latitude::double precision))
          * cos(radians(p.longitude::double precision) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(p.latitude::double precision))
        ))
      )
    ) <= p_radius_km;
$function$;

GRANT EXECUTE ON FUNCTION public.count_mission_notification_audience(double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_mission_notification_audience(double precision, double precision, integer) TO service_role;

-- 2. Surveillance de la file gardiens : toute ligne bloquée plus de 48 heures.
CREATE OR REPLACE FUNCTION public.detect_stale_digest_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted integer := 0;
BEGIN
  WITH stale AS (
    SELECT q.id, q.sitter_id, q.sit_id, q.queued_at
    FROM public.sitter_digest_queue q
    WHERE q.status = 'queued'
      AND q.queued_at < now() - interval '48 hours'
  ), ins AS (
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
    SELECT
      'digest_queue_stalled',
      'warning',
      'content',
      s.id,
      jsonb_build_object(
        'sitter_id', s.sitter_id,
        'sit_id', s.sit_id,
        'queued_at', s.queued_at,
        'hours_stalled', ROUND(EXTRACT(epoch FROM (now() - s.queued_at)) / 3600)
      )
    FROM stale s
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO v_inserted FROM ins;

  -- Referme les signaux dont la ligne de file a été traitée entre temps.
  UPDATE public.admin_signals a
  SET resolved_at = now(), action_taken = 'auto_resolved_queue_drained'
  WHERE a.signal_type = 'digest_queue_stalled'
    AND a.resolved_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.sitter_digest_queue q
      WHERE q.id = a.entity_id AND q.status = 'queued'
    );

  RETURN v_inserted;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.detect_stale_digest_queue() TO service_role;

-- 3. Passage quotidien.
SELECT cron.unschedule('detect-stale-digest-queue')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'detect-stale-digest-queue');

SELECT cron.schedule(
  'detect-stale-digest-queue',
  '45 7 * * *',
  $$SELECT public.detect_stale_digest_queue();$$
);