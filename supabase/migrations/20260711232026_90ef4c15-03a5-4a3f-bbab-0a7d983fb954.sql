
CREATE OR REPLACE FUNCTION public.detect_stale_sits()
RETURNS TABLE (
  sit_id uuid,
  owner_id uuid,
  sit_title text,
  sit_city text,
  latitude double precision,
  longitude double precision,
  days_since_published integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.user_id AS owner_id,
    s.title,
    s.city,
    p.latitude,
    p.longitude,
    EXTRACT(day FROM now() - s.created_at)::integer AS days_since_published
  FROM public.sits s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.applications a ON a.sit_id = s.id
  WHERE s.status = 'published'
    AND s.created_at < now() - interval '3 days'
  GROUP BY s.id, p.latitude, p.longitude
  HAVING COUNT(a.id) = 0;
$$;

REVOKE ALL ON FUNCTION public.detect_stale_sits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_stale_sits() TO service_role;

CREATE OR REPLACE FUNCTION public.count_eligible_sitters(
  p_lat double precision,
  p_lng double precision,
  p_radius_km integer DEFAULT 30
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles p
  WHERE p.role IN ('sitter', 'both')
    AND p.identity_verified = true
    AND COALESCE(p.profile_completion, 0) >= 60
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p_lat IS NOT NULL
    AND p_lng IS NOT NULL
    AND (
      6371 * acos(
        LEAST(1.0,
          cos(radians(p_lat)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(p.latitude))
        )
      )
    ) <= p_radius_km;
$$;

REVOKE ALL ON FUNCTION public.count_eligible_sitters(double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_eligible_sitters(double precision, double precision, integer) TO authenticated, service_role;

SELECT cron.unschedule('nudge-owner-no-applications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nudge-owner-no-applications');

SELECT cron.schedule(
  'nudge-owner-no-applications',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/nudge-owner-no-applications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
