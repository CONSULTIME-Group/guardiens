REVOKE ALL ON FUNCTION public.prerender_render_budget_status(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prerender_render_budget_status(integer) TO service_role;