CREATE TABLE IF NOT EXISTS public.email_cap_bypass_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  category text,
  defer_reason text,
  scheduled_for timestamptz,
  ttl_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_cap_bypass_log TO service_role;
GRANT SELECT ON public.email_cap_bypass_log TO authenticated;

ALTER TABLE public.email_cap_bypass_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read cap bypass log" ON public.email_cap_bypass_log;
CREATE POLICY "Admins read cap bypass log"
ON public.email_cap_bypass_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS email_cap_bypass_log_template_created_idx
  ON public.email_cap_bypass_log (template_name, created_at DESC);

CREATE OR REPLACE FUNCTION public.email_cap_bypass_counts(p_days integer DEFAULT 7)
RETURNS TABLE(template_name text, bypass_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT b.template_name, COUNT(*)::bigint
  FROM public.email_cap_bypass_log b
  WHERE b.created_at >= now() - make_interval(days => p_days)
  GROUP BY b.template_name
  ORDER BY 2 DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.email_cap_bypass_counts(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.email_delivery_rate_by_template(p_days integer DEFAULT 7)
RETURNS TABLE(
  template_name text,
  attempts bigint,
  sent bigint,
  cancelled bigint,
  failed bigint,
  delivery_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH latest AS (
    SELECT DISTINCT ON (l.message_id) l.message_id, l.template_name AS tpl, l.status, l.created_at
    FROM public.email_send_log l
    WHERE l.message_id IS NOT NULL
      AND l.created_at >= now() - make_interval(days => p_days)
    ORDER BY l.message_id, l.created_at DESC
  )
  SELECT
    latest.tpl,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'sent')::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'cancelled')::bigint,
    COUNT(*) FILTER (WHERE latest.status IN ('dlq', 'failed', 'bounced'))::bigint,
    ROUND(100.0 * COUNT(*) FILTER (WHERE latest.status = 'sent') / NULLIF(COUNT(*), 0), 1)
  FROM latest
  GROUP BY latest.tpl
  ORDER BY 6 ASC NULLS LAST;
$function$;

GRANT EXECUTE ON FUNCTION public.email_delivery_rate_by_template(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.detect_low_email_delivery()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted integer := 0;
BEGIN
  WITH bad AS (
    SELECT r.*
    FROM public.email_delivery_rate_by_template(7) r
    WHERE r.attempts >= 20
      AND COALESCE(r.delivery_rate, 0) < 70
  ), fresh AS (
    SELECT b.*
    FROM bad b
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_signals a
      WHERE a.signal_type = 'email_delivery_low'
        AND a.resolved_at IS NULL
        AND a.metadata->>'template_name' = b.template_name
    )
  ), ins AS (
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, metadata)
    SELECT
      'email_delivery_low',
      CASE WHEN f.delivery_rate < 50 THEN 'critical' ELSE 'warning' END,
      'content',
      jsonb_build_object(
        'template_name', f.template_name,
        'attempts', f.attempts,
        'sent', f.sent,
        'cancelled', f.cancelled,
        'failed', f.failed,
        'delivery_rate', f.delivery_rate,
        'window_days', 7,
        'threshold', 70
      )
    FROM fresh f
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO v_inserted FROM ins;

  UPDATE public.admin_signals a
  SET resolved_at = now(), action_taken = 'auto_resolved_delivery_recovered'
  WHERE a.signal_type = 'email_delivery_low'
    AND a.resolved_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.email_delivery_rate_by_template(7) r
      WHERE r.template_name = a.metadata->>'template_name'
        AND r.attempts >= 20
        AND COALESCE(r.delivery_rate, 0) < 70
    );

  RETURN v_inserted;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.detect_low_email_delivery() TO service_role;

SELECT cron.unschedule('detect-low-email-delivery')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'detect-low-email-delivery');

SELECT cron.schedule(
  'detect-low-email-delivery',
  '30 8 * * *',
  $$SELECT public.detect_low_email_delivery();$$
);