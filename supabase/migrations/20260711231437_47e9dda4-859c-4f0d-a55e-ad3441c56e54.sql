
-- 1) Table admin_signals
CREATE TABLE public.admin_signals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type  text NOT NULL,
  severity     text NOT NULL CHECK (severity IN ('critical','warning','info')),
  entity_type  text NOT NULL,
  entity_id    uuid NOT NULL,
  detected_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_taken text,
  admin_id     uuid REFERENCES public.profiles(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_signals TO authenticated;
GRANT ALL ON public.admin_signals TO service_role;

ALTER TABLE public.admin_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin_signals"
  ON public.admin_signals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can write admin_signals"
  ON public.admin_signals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_signals_unresolved
  ON public.admin_signals(detected_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX idx_admin_signals_type
  ON public.admin_signals(signal_type, detected_at DESC)
  WHERE resolved_at IS NULL;

CREATE UNIQUE INDEX idx_admin_signals_idempotent
  ON public.admin_signals(signal_type, entity_id)
  WHERE resolved_at IS NULL;

-- 2) Feature flag admin_signals_active
INSERT INTO public.feature_flags (key, enabled, applies_since)
VALUES ('admin_signals_active', true, now())
ON CONFLICT (key) DO NOTHING;

-- 3) RPC omnibus admin_dashboard_snapshot
CREATE OR REPLACE FUNCTION public.admin_dashboard_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  affinity_since timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT applies_since INTO affinity_since
  FROM public.feature_flags WHERE key = 'mandatory_affinity_onboarding';

  SELECT jsonb_build_object(
    'signals', COALESCE((
      SELECT jsonb_agg(row_to_json(s) ORDER BY
        CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        detected_at DESC)
      FROM (
        SELECT * FROM public.admin_signals
        WHERE resolved_at IS NULL AND severity <> 'info'
        LIMIT 20
      ) s
    ), '[]'::jsonb),
    'kpis', jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM public.profiles),
      'owners', (SELECT COUNT(*) FROM public.profiles WHERE role IN ('owner','both')),
      'sitters', (SELECT COUNT(*) FROM public.profiles WHERE role IN ('sitter','both')),
      'new_this_week', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
      'active_listings', (SELECT COUNT(*) FROM public.sits WHERE status = 'published'),
      'ongoing_sits', (SELECT COUNT(*) FROM public.sits WHERE status = 'published' AND start_date <= now() AND end_date >= now()),
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
      END
    ),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_snapshot() TO authenticated;
