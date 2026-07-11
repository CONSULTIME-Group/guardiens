
REVOKE EXECUTE ON FUNCTION public.detect_dormant_sitters() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_stale_verifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_affinity_stale() FROM PUBLIC, anon, authenticated;
