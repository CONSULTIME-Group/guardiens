CREATE TABLE IF NOT EXISTS public._backup_dashboard_snapshot_s1b_20260928 (
  id serial PRIMARY KEY, function_name text NOT NULL, definition text NOT NULL, saved_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public._backup_dashboard_snapshot_s1b_20260928 FROM anon, authenticated;
GRANT ALL ON public._backup_dashboard_snapshot_s1b_20260928 TO service_role;
ALTER TABLE public._backup_dashboard_snapshot_s1b_20260928 ENABLE ROW LEVEL SECURITY;
-- Retour arriere : EXECUTE (SELECT definition FROM public._backup_dashboard_snapshot_s1b_20260928 WHERE function_name = 'admin_dashboard_snapshot');
INSERT INTO public._backup_dashboard_snapshot_s1b_20260928 (function_name, definition)
SELECT 'admin_dashboard_snapshot', pg_get_functiondef('public.admin_dashboard_snapshot()'::regprocedure);

CREATE OR REPLACE FUNCTION public.admin_dashboard_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  affinity_since timestamptz;
  signals_active boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin')
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT applies_since INTO affinity_since
  FROM public.feature_flags WHERE key = 'mandatory_affinity_onboarding';

  SELECT COALESCE(enabled, false) INTO signals_active
  FROM public.feature_flags WHERE key = 'admin_signals_active';

  SELECT jsonb_build_object(
    'signals', CASE WHEN COALESCE(signals_active, false) THEN COALESCE((
      SELECT jsonb_agg(row_to_json(s) ORDER BY
        CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        detected_at DESC)
      FROM (
        SELECT * FROM public.admin_signals
        WHERE resolved_at IS NULL AND severity <> 'info'
        ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
          detected_at DESC
        LIMIT 20
      ) s
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    'signals_open_total', CASE WHEN COALESCE(signals_active, false) THEN (
      SELECT COUNT(*) FROM public.admin_signals WHERE resolved_at IS NULL AND severity <> 'info'
    ) ELSE 0 END,
    'signals_critical_total', CASE WHEN COALESCE(signals_active, false) THEN (
      SELECT COUNT(*) FROM public.admin_signals WHERE resolved_at IS NULL AND severity = 'critical'
    ) ELSE 0 END,
    'kpis', jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM public.profiles),
      'owners', (SELECT COUNT(*) FROM public.profiles WHERE role = 'owner'),
      'sitters', (SELECT COUNT(*) FROM public.profiles WHERE role = 'sitter'),
      'both', (SELECT COUNT(*) FROM public.profiles WHERE role = 'both'),
      'new_this_week', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
      'active_listings', (SELECT COUNT(*) FROM public.sits WHERE status = 'published'),
      'ongoing_sits', (SELECT COUNT(*) FROM public.sits WHERE status = 'confirmed'),
      'reviews_count', (SELECT COUNT(*) FROM public.reviews WHERE moderation_status = 'valide' OR published = true),
      'reviews_avg', COALESCE((SELECT AVG(overall_rating)::numeric(3,2) FROM public.reviews WHERE moderation_status = 'valide' OR published = true), 0)
    ),
    'recent_activity', COALESCE((
      SELECT jsonb_agg(row_to_json(r))
      FROM (
        SELECT 'signup' AS type, id, created_at, first_name AS label, role
        FROM public.profiles
        ORDER BY created_at DESC LIMIT 10
      ) r
    ), '[]'::jsonb),
    'seo', jsonb_build_object(
      'articles_published', (SELECT COUNT(*) FROM public.articles WHERE published = true),
      'city_pages_indexable', (SELECT COUNT(*) FROM public.seo_city_pages WHERE published = true AND (noindex IS NULL OR noindex = false)),
      'sitemap_dirty', (SELECT COUNT(*) FROM public.articles WHERE seo_dirty_at IS NOT NULL)
    ),
    'affinity', jsonb_build_object(
      'onboarding_flag_active', (SELECT enabled FROM public.feature_flags WHERE key = 'mandatory_affinity_onboarding'),
      'concerned_signups', CASE
        WHEN affinity_since IS NULL THEN 0
        ELSE (SELECT COUNT(*) FROM public.profiles WHERE created_at >= affinity_since)
      END,
      'onboarding_stale_count', (SELECT COUNT(*) FROM public.detect_affinity_stale())
    ),
    'liquidity', public.admin_liquidity_snapshot(),
    'signals_active', COALESCE(signals_active, false),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$function$;

COMMENT ON COLUMN public.admin_signals.severity IS 'critical, warning ou info. admin_dashboard_snapshot trie par gravite puis detected_at DESC avant LIMIT 20 (lot S1b).';