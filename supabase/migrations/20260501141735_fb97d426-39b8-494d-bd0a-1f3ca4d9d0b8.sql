REVOKE EXECUTE ON FUNCTION public.admin_analytics_event_counts(timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_analytics_daily_events(timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_analytics_top_sources(timestamptz, timestamptz, text, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_analytics_role_breakdown(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.normalize_analytics_source(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_analytics_event_counts(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_daily_events(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_top_sources(timestamptz, timestamptz, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_role_breakdown(timestamptz, timestamptz) TO authenticated;