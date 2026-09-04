
REVOKE EXECUTE ON FUNCTION public.compute_responsiveness_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_responsiveness_stats() TO service_role;
