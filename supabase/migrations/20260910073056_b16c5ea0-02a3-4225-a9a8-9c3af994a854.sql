-- A. Trou de couverture : comptage strictement géographique, sans filtre d'identité.
CREATE OR REPLACE FUNCTION public.detect_city_coverage_gaps(
  p_radius_km numeric DEFAULT 30,
  p_min_sitters integer DEFAULT 3
)
RETURNS TABLE(
  city_page_id uuid,
  city text,
  slug text,
  radius_km numeric,
  sitters_count integer,
  verified_sitters_count integer,
  active_sits_count integer,
  gsc_impressions integer,
  gsc_clicks integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH pages AS (
    SELECT scp.id, scp.city, scp.slug, scp.latitude, scp.longitude
    FROM public.seo_city_pages scp
    WHERE scp.published
      AND scp.latitude IS NOT NULL
      AND scp.longitude IS NOT NULL
  ),
  sitters AS (
    -- Aucun filtre identity_verified : la verification est une information,
    -- jamais une porte. Le comptage est purement geographique.
    SELECT p.latitude AS lat, p.longitude AS lng,
           COALESCE(p.identity_verified, false) AS verified
    FROM public.profiles p
    WHERE p.role IN ('sitter','both')
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
  ),
  gsc AS (
    SELECT (item->'keys'->>0) AS url,
           COALESCE((item->>'impressions')::integer, 0) AS impressions,
           COALESCE((item->>'clicks')::integer, 0) AS clicks
    FROM public.seo_cache,
      LATERAL jsonb_array_elements(data->'gsc'->'topPages') AS item
    WHERE cache_key = 'seo_dashboard'
  ),
  gsc_by_page AS (
    SELECT pg.id AS page_id,
           SUM(g.impressions)::integer AS impressions,
           SUM(g.clicks)::integer AS clicks
    FROM gsc g
    JOIN pages pg ON g.url ILIKE '%/' || pg.slug || '%'
    GROUP BY pg.id
  ),
  sits_by_page AS (
    -- Comparaison de nom insensible aux accents et a la casse.
    SELECT pg.id AS page_id, COUNT(*)::integer AS cnt
    FROM public.sits s
    JOIN pages pg
      ON public.unaccent(LOWER(s.city)) = public.unaccent(LOWER(pg.city))
    WHERE s.status = 'published' AND s.city IS NOT NULL
    GROUP BY pg.id
  ),
  counted AS (
    SELECT pg.id, pg.city, pg.slug, c.total, c.verified
    FROM pages pg
    CROSS JOIN LATERAL (
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE s.verified)::integer AS verified
      FROM sitters s
      WHERE 6371 * acos(LEAST(1, GREATEST(-1,
              cos(radians(pg.latitude)) * cos(radians(s.lat))
                * cos(radians(s.lng) - radians(pg.longitude))
              + sin(radians(pg.latitude)) * sin(radians(s.lat))
            ))) <= p_radius_km
    ) c
  )
  SELECT
    c.id,
    c.city,
    c.slug,
    p_radius_km,
    c.total,
    c.verified,
    COALESCE(sp.cnt, 0),
    COALESCE(gp.impressions, 0),
    COALESCE(gp.clicks, 0)
  FROM counted c
  LEFT JOIN sits_by_page sp ON sp.page_id = c.id
  LEFT JOIN gsc_by_page gp ON gp.page_id = c.id
  WHERE c.total < p_min_sitters
  ORDER BY c.total ASC, COALESCE(gp.impressions, 0) DESC, c.city ASC;
$function$;

COMMENT ON FUNCTION public.detect_city_coverage_gaps(numeric, integer) IS
  'Villes publiees comptant moins de p_min_sitters gardiens dans p_radius_km. Comptage geographique pur, identity_verified jamais filtrant, seulement renvoye a titre indicatif. Ce rayon de comptage administratif n''a aucun rapport avec LEGACY_UNANSWERED_RADIUS_KM du formulaire gardien.';

-- B. Tension SEO : impressions rapportees a l'offre locale, seuil relatif.
CREATE OR REPLACE FUNCTION public.detect_city_seo_tension(
  p_radius_km numeric DEFAULT 30,
  p_min_impressions integer DEFAULT 100,
  p_percentile numeric DEFAULT 0.9,
  p_min_sample integer DEFAULT 20
)
RETURNS TABLE(
  city_page_id uuid,
  city text,
  slug text,
  radius_km numeric,
  sitters_count integer,
  verified_sitters_count integer,
  gsc_impressions integer,
  gsc_clicks integer,
  tension_ratio numeric,
  tension_threshold numeric,
  sample_size integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH pages AS (
    SELECT scp.id, scp.city, scp.slug, scp.latitude, scp.longitude
    FROM public.seo_city_pages scp
    WHERE scp.published
      AND scp.latitude IS NOT NULL
      AND scp.longitude IS NOT NULL
  ),
  sitters AS (
    SELECT p.latitude AS lat, p.longitude AS lng,
           COALESCE(p.identity_verified, false) AS verified
    FROM public.profiles p
    WHERE p.role IN ('sitter','both')
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
  ),
  gsc AS (
    SELECT (item->'keys'->>0) AS url,
           COALESCE((item->>'impressions')::integer, 0) AS impressions,
           COALESCE((item->>'clicks')::integer, 0) AS clicks
    FROM public.seo_cache,
      LATERAL jsonb_array_elements(data->'gsc'->'topPages') AS item
    WHERE cache_key = 'seo_dashboard'
  ),
  gsc_by_page AS (
    SELECT pg.id AS page_id,
           SUM(g.impressions)::integer AS impressions,
           SUM(g.clicks)::integer AS clicks
    FROM gsc g
    JOIN pages pg ON g.url ILIKE '%/' || pg.slug || '%'
    GROUP BY pg.id
  ),
  counted AS (
    SELECT pg.id, pg.city, pg.slug, c.total, c.verified,
           gp.impressions, gp.clicks,
           ROUND(gp.impressions::numeric / (c.total + 1), 2) AS ratio
    FROM pages pg
    JOIN gsc_by_page gp ON gp.page_id = pg.id
    CROSS JOIN LATERAL (
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE s.verified)::integer AS verified
      FROM sitters s
      WHERE 6371 * acos(LEAST(1, GREATEST(-1,
              cos(radians(pg.latitude)) * cos(radians(s.lat))
                * cos(radians(s.lng) - radians(pg.longitude))
              + sin(radians(pg.latitude)) * sin(radians(s.lat))
            ))) <= p_radius_km
    ) c
    WHERE gp.impressions >= p_min_impressions
  ),
  stats AS (
    SELECT COUNT(*)::integer AS sample,
           PERCENTILE_CONT(p_percentile) WITHIN GROUP (ORDER BY ratio)::numeric AS threshold
    FROM counted
  )
  SELECT c.id, c.city, c.slug, p_radius_km, c.total, c.verified,
         c.impressions, c.clicks, c.ratio,
         ROUND(st.threshold, 2), st.sample
  FROM counted c
  CROSS JOIN stats st
  -- Sans echantillon suffisant, aucun seuil credible : on ne remonte rien.
  WHERE st.sample >= p_min_sample
    AND c.ratio >= st.threshold
  ORDER BY c.ratio DESC, c.city ASC;
$function$;

COMMENT ON FUNCTION public.detect_city_seo_tension(numeric, integer, numeric, integer) IS
  'Villes ou la demande Google depasse l''offre locale : impressions / (gardiens a p_radius_km + 1), seuil relatif au percentile p_percentile. Ne renvoie rien tant que l''echantillon GSC est inferieur a p_min_sample.';

COMMENT ON FUNCTION public.detect_untapped_cities() IS
  'DEPRECIEE le 10/09/2026. Comptait les gardiens par nom de ville exact, avec filtre identity_verified (79 gardiens sur 1159) et sans unaccent, donc annonçait 0 gardien sur des villes fournies. Remplacee par detect_city_coverage_gaps et detect_city_seo_tension. Ne plus appeler.';

GRANT EXECUTE ON FUNCTION public.detect_city_coverage_gaps(numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_city_seo_tension(numeric, integer, numeric, integer) TO service_role;

INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('admin_signal_city_seo_tension', false, 'Signal admin de tension SEO par ville. Desactive tant que l''historique GSC est insuffisant pour un seuil credible.')
ON CONFLICT (key) DO NOTHING;