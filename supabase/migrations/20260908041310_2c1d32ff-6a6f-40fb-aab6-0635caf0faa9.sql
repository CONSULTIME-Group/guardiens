CREATE OR REPLACE FUNCTION public.prerender_render_budget_status(p_monthly_budget integer DEFAULT 18000)
RETURNS TABLE (
  month_start date,
  renders_used bigint,
  monthly_budget integer,
  percent_used numeric,
  last_wave_at timestamptz,
  last_wave_rows integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('month', now() AT TIME ZONE 'UTC')::date AS month_start,
    (SELECT count(*) FROM public.prerender_recache_log l
      WHERE l.created_at >= date_trunc('month', now())) AS renders_used,
    p_monthly_budget AS monthly_budget,
    round(
      100.0 * (SELECT count(*) FROM public.prerender_recache_log l
                WHERE l.created_at >= date_trunc('month', now()))
      / NULLIF(p_monthly_budget, 0), 1) AS percent_used,
    (SELECT f.marked_at FROM public.deploy_fingerprints f
      WHERE f.marked_at IS NOT NULL ORDER BY f.marked_at DESC LIMIT 1) AS last_wave_at,
    (SELECT f.marked_rows FROM public.deploy_fingerprints f
      WHERE f.marked_at IS NOT NULL ORDER BY f.marked_at DESC LIMIT 1) AS last_wave_rows;
$$;

REVOKE ALL ON FUNCTION public.prerender_render_budget_status(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prerender_render_budget_status(integer) TO authenticated, service_role;