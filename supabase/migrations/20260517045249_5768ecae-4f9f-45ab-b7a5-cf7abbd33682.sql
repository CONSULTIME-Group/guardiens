
REVOKE ALL ON FUNCTION public.increment_photo_analysis_quota(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_photo_analysis_quota(UUID) TO service_role;
