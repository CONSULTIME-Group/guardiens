DROP VIEW IF EXISTS public.email_idempotency_daily_counts;

CREATE VIEW public.email_idempotency_daily_counts
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  template_name,
  hit_type,
  count(*)::bigint AS hits
FROM public.email_idempotency_hits
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

GRANT SELECT ON public.email_idempotency_daily_counts TO authenticated;