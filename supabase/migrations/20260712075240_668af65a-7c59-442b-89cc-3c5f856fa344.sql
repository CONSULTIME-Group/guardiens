-- 1) Colonnes admin sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_boosted_until
  ON public.profiles(boosted_until) WHERE boosted_until IS NOT NULL;

-- 2) detect_untapped_cities : matche les topPages GSC contre seo_city_pages.slug
CREATE OR REPLACE FUNCTION public.detect_untapped_cities()
RETURNS TABLE (
  city text,
  gsc_impressions integer,
  gsc_clicks integer,
  local_sitters_count integer,
  active_sits_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH gsc AS (
    SELECT
      (item->'keys'->>0) AS url,
      COALESCE((item->>'impressions')::integer, 0) AS impressions,
      COALESCE((item->>'clicks')::integer, 0) AS clicks
    FROM public.seo_cache,
      LATERAL jsonb_array_elements(data->'gsc'->'topPages') AS item
    WHERE cache_key = 'seo_dashboard'
  ),
  matched AS (
    SELECT
      scp.city,
      SUM(g.impressions)::integer AS impressions,
      SUM(g.clicks)::integer AS clicks
    FROM gsc g
    JOIN public.seo_city_pages scp
      ON g.url ILIKE '%/' || scp.slug || '%'
    GROUP BY scp.city
  ),
  sitters_by_city AS (
    SELECT LOWER(city) AS city_lower, COUNT(*)::integer AS cnt
    FROM public.profiles
    WHERE role IN ('sitter','both')
      AND identity_verified = true
      AND city IS NOT NULL
    GROUP BY LOWER(city)
  ),
  sits_by_city AS (
    SELECT LOWER(city) AS city_lower, COUNT(*)::integer AS cnt
    FROM public.sits
    WHERE status = 'published' AND city IS NOT NULL
    GROUP BY LOWER(city)
  )
  SELECT
    m.city,
    m.impressions,
    m.clicks,
    COALESCE(s.cnt, 0),
    COALESCE(sits.cnt, 0)
  FROM matched m
  LEFT JOIN sitters_by_city s ON s.city_lower = LOWER(m.city)
  LEFT JOIN sits_by_city sits ON sits.city_lower = LOWER(m.city)
  WHERE m.impressions >= 100
    AND COALESCE(s.cnt, 0) < 3;
END;
$$;

-- 3) detect_dormant_top_sitters
CREATE OR REPLACE FUNCTION public.detect_dormant_top_sitters()
RETURNS TABLE (
  sitter_id uuid,
  first_name text,
  avg_rating numeric,
  reviews_count integer,
  days_since_last_application integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sitter_stats AS (
    SELECT
      r.reviewee_id AS sitter_id,
      AVG(r.overall_rating)::numeric(3,2) AS avg_rating,
      COUNT(*)::integer AS reviews_count
    FROM public.reviews r
    WHERE r.moderation_status = 'valide'
      AND r.review_type = 'garde'
      AND r.published = true
    GROUP BY r.reviewee_id
    HAVING AVG(r.overall_rating) >= 4.7 AND COUNT(*) >= 3
  ),
  last_apps AS (
    SELECT sitter_id, MAX(created_at) AS last_at
    FROM public.applications
    GROUP BY sitter_id
  )
  SELECT
    p.id,
    p.first_name,
    ss.avg_rating,
    ss.reviews_count,
    EXTRACT(day FROM now() - COALESCE(la.last_at, p.created_at))::integer
  FROM sitter_stats ss
  JOIN public.profiles p ON p.id = ss.sitter_id
  LEFT JOIN last_apps la ON la.sitter_id = ss.sitter_id
  WHERE COALESCE(la.last_at, p.created_at) < now() - interval '30 days'
    AND (p.role IN ('sitter','both'))
    AND (p.suspended_until IS NULL OR p.suspended_until < now());
$$;

-- 4) detect_suspicious_accounts (cas 1 uniquement, cas 2 haversine reporté)
CREATE OR REPLACE FUNCTION public.detect_suspicious_accounts()
RETURNS TABLE (
  profile_id uuid,
  first_name text,
  email text,
  signal text,
  detail text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (p.id)
    p.id,
    p.first_name,
    p.email,
    'fast_apply'::text,
    'Inscription puis candidature en moins de 2 heures'::text,
    p.created_at
  FROM public.profiles p
  JOIN public.applications a ON a.sitter_id = p.id
  WHERE a.created_at < p.created_at + interval '2 hours'
    AND p.created_at > now() - interval '48 hours';
$$;

-- 5) detect_repeated_cancellations
-- reviews.review_type = 'cancellation', cancelled_by_role in ('gardien','proprio')
-- reviewee_id = personne responsable de l'annulation
CREATE OR REPLACE FUNCTION public.detect_repeated_cancellations()
RETURNS TABLE (
  profile_id uuid,
  first_name text,
  role text,
  cancellations_count integer,
  period_days integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.first_name,
    r.cancelled_by_role,
    COUNT(*)::integer,
    90
  FROM public.reviews r
  JOIN public.profiles p ON p.id = r.reviewee_id
  WHERE r.review_type = 'cancellation'
    AND r.created_at > now() - interval '90 days'
    AND r.cancelled_by_role IN ('gardien','proprio')
  GROUP BY p.id, p.first_name, r.cancelled_by_role
  HAVING COUNT(*) >= 2;
$$;

-- 6) detect_repeated_republished_sits
CREATE OR REPLACE FUNCTION public.detect_repeated_republished_sits()
RETURNS TABLE (
  owner_id uuid,
  first_name text,
  sit_title_pattern text,
  republish_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    p.first_name,
    LOWER(SUBSTRING(s.title FROM 1 FOR 40)),
    COUNT(*)::integer
  FROM public.sits s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.status IN ('published','archived','cancelled')
    AND s.created_at > now() - interval '180 days'
    AND s.title IS NOT NULL
  GROUP BY s.user_id, p.first_name, LOWER(SUBSTRING(s.title FROM 1 FOR 40))
  HAVING COUNT(*) >= 3;
$$;

GRANT EXECUTE ON FUNCTION public.detect_untapped_cities() TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_dormant_top_sitters() TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_accounts() TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_repeated_cancellations() TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_repeated_republished_sits() TO service_role;