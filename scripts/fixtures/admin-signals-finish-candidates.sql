WITH stale_draft_obsolete AS (
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
)
SELECT now() AS checked_at, signal_type, count(*) AS candidates FROM (
 SELECT * FROM stale_draft_obsolete UNION ALL SELECT * FROM discussion_concluded
 UNION ALL SELECT * FROM city_coverage_recovered
) c GROUP BY signal_type
UNION ALL
SELECT now(), 'city_coverage_severity_change', count(*)
FROM city_coverage_counts c JOIN public.admin_signals s ON s.id=c.id
WHERE c.total<3 AND s.severity IS DISTINCT FROM CASE WHEN c.total=0 THEN 'critical' ELSE 'warning' END;