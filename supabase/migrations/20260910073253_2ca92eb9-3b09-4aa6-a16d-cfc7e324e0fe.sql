REVOKE EXECUTE ON FUNCTION public.detect_city_coverage_gaps(numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_city_seo_tension(numeric, integer, numeric, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_city_coverage_gaps(numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_city_seo_tension(numeric, integer, numeric, integer) TO service_role;