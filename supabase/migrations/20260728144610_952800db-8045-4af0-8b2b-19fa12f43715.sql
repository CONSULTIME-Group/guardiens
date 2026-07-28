CREATE OR REPLACE FUNCTION public.detect_untapped_cities()
 RETURNS TABLE(city text, gsc_impressions integer, gsc_clicks integer, local_sitters_count integer, active_sits_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      scp.city AS c,
      SUM(g.impressions)::integer AS impressions,
      SUM(g.clicks)::integer AS clicks
    FROM gsc g
    JOIN public.seo_city_pages scp
      ON g.url ILIKE '%/' || scp.slug || '%'
    GROUP BY scp.city
  ),
  sitters_by_city AS (
    SELECT LOWER(p.city) AS city_lower, COUNT(*)::integer AS cnt
    FROM public.profiles p
    WHERE p.role IN ('sitter','both')
      AND p.identity_verified = true
      AND p.city IS NOT NULL
    GROUP BY LOWER(p.city)
  ),
  sits_by_city AS (
    SELECT LOWER(s2.city) AS city_lower, COUNT(*)::integer AS cnt
    FROM public.sits s2
    WHERE s2.status = 'published' AND s2.city IS NOT NULL
    GROUP BY LOWER(s2.city)
  )
  SELECT
    m.c,
    m.impressions,
    m.clicks,
    COALESCE(s.cnt, 0),
    COALESCE(sits.cnt, 0)
  FROM matched m
  LEFT JOIN sitters_by_city s ON s.city_lower = LOWER(m.c)
  LEFT JOIN sits_by_city sits ON sits.city_lower = LOWER(m.c)
  WHERE m.impressions >= 100
    AND COALESCE(s.cnt, 0) < 3;
END;
$function$;