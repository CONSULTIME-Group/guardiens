CREATE OR REPLACE VIEW public.email_delivery_stats AS
SELECT
  template_name,
  DATE_TRUNC('day', created_at)::date AS day,
  COUNT(*) AS sent,
  COUNT(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
  COUNT(*) FILTER (WHERE first_opened_at IS NOT NULL) AS opened,
  COUNT(*) FILTER (WHERE first_clicked_at IS NOT NULL) AS clicked,
  COUNT(*) FILTER (WHERE bounced_at IS NOT NULL) AS bounced,
  COUNT(*) FILTER (WHERE complained_at IS NOT NULL) AS complained,
  ROUND(100.0 * COUNT(*) FILTER (WHERE first_opened_at IS NOT NULL) / NULLIF(COUNT(*), 0), 1) AS open_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE first_clicked_at IS NOT NULL) / NULLIF(COUNT(*), 0), 1) AS click_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE bounced_at IS NOT NULL) / NULLIF(COUNT(*), 0), 1) AS bounce_rate
FROM public.email_send_log
WHERE status IN ('sent', 'delivered', 'bounced', 'complained')
GROUP BY template_name, DATE_TRUNC('day', created_at);

GRANT SELECT ON public.email_delivery_stats TO authenticated;
GRANT SELECT ON public.email_delivery_stats TO service_role;