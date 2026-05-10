REVOKE EXECUTE ON FUNCTION public.increment_redirect_hit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_redirect_hit(text) TO service_role;