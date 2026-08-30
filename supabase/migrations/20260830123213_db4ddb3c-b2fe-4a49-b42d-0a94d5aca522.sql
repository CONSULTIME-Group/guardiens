
-- 1. Vue des stats quotidiennes : exclusion des lignes de report.
-- Une ligne portant metadata.defer_reason sans resend_id est une intention
-- d'envoi, jamais un envoi. La compter ecrasait les taux affiches.
CREATE OR REPLACE VIEW public.email_delivery_stats AS
 SELECT template_name,
    date_trunc('day'::text, created_at)::date AS day,
    count(*) AS sent,
    count(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
    count(*) FILTER (WHERE first_opened_at IS NOT NULL) AS opened,
    count(*) FILTER (WHERE first_clicked_at IS NOT NULL) AS clicked,
    count(*) FILTER (WHERE bounced_at IS NOT NULL) AS bounced,
    count(*) FILTER (WHERE complained_at IS NOT NULL) AS complained,
    round(100.0 * count(*) FILTER (WHERE first_opened_at IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 1) AS open_rate,
    round(100.0 * count(*) FILTER (WHERE first_clicked_at IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 1) AS click_rate,
    round(100.0 * count(*) FILTER (WHERE bounced_at IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 1) AS bounce_rate
   FROM email_send_log
  WHERE status = ANY (ARRAY['sent'::text, 'delivered'::text, 'bounced'::text, 'complained'::text])
    AND NOT (metadata ? 'defer_reason' AND resend_id IS NULL)
  GROUP BY template_name, (date_trunc('day'::text, created_at));

-- 2. Taux par gabarit : les lignes de report restent comptees dans les
-- tentatives et l'attrition, mais ne peuvent plus alimenter ni les envois ni
-- les livraisons.
CREATE OR REPLACE FUNCTION public.email_delivery_rate_by_template(p_days integer DEFAULT 7)
RETURNS TABLE(template_name text, attempts bigint, sent bigint, delivered bigint, deferred bigint, abandoned bigint, cancelled bigint, failed bigint, delivery_rate numeric, abandon_rate numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH latest AS (
    SELECT DISTINCT ON (l.message_id)
      l.message_id, l.template_name AS tpl, l.status, l.delivered_at,
      (l.metadata ? 'defer_reason' AND l.resend_id IS NULL) AS is_defer
    FROM public.email_send_log l
    WHERE l.message_id IS NOT NULL
      AND l.created_at >= GREATEST(now() - make_interval(days => p_days), '2026-07-22T00:00:00Z'::timestamptz)
    ORDER BY l.message_id, l.created_at DESC
  )
  SELECT
    latest.tpl,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'sent' AND NOT latest.is_defer)::bigint,
    COUNT(*) FILTER (WHERE latest.delivered_at IS NOT NULL AND NOT latest.is_defer)::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'deferred')::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'abandoned')::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'cancelled')::bigint,
    COUNT(*) FILTER (WHERE latest.status IN ('dlq', 'failed', 'bounced'))::bigint,
    ROUND(100.0 * COUNT(*) FILTER (WHERE latest.delivered_at IS NOT NULL AND NOT latest.is_defer)
          / NULLIF(COUNT(*) FILTER (WHERE latest.status = 'sent' AND NOT latest.is_defer), 0), 1),
    ROUND(100.0 * (COUNT(*) FILTER (WHERE latest.status = 'abandoned') + COUNT(*) FILTER (WHERE latest.status = 'cancelled'))
          / NULLIF(COUNT(*), 0), 1)
  FROM latest
  GROUP BY latest.tpl
  ORDER BY 9 ASC NULLS LAST;
$fn$;

-- 3. Derive du miroir : une ligne de report effectivement partie porte
-- desormais metadata.flushed_at et reste en statut 'deferred'. Elle n'est plus
-- une derive.
CREATE OR REPLACE FUNCTION public.email_mirror_drift_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COUNT(*)
  FROM public.email_send_log l
  WHERE l.status = 'deferred'
    AND l.created_at < now() - interval '24 hours'
    AND l.metadata->>'flushed_at' IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.email_deferred_queue q
      WHERE q.idempotency_key = l.metadata->>'idempotency_key'
        AND q.status IN ('pending', 'processing')
    );
$fn$;

COMMENT ON FUNCTION public.email_delivery_rate_by_template(integer) IS
  'Taux par gabarit. Les lignes de report (metadata.defer_reason sans resend_id) ne sont jamais comptees comme envoi ni comme livraison.';
