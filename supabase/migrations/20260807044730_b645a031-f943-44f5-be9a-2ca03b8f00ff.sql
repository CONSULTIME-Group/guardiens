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
    SELECT r.* FROM public.email_delivery_rate_by_template(7) r
    WHERE r.attempts >= 20 AND COALESCE(r.delivery_rate, 0) < 70
  ), fresh AS (
    SELECT b.* FROM bad b
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_signals a
      WHERE a.signal_type = 'email_delivery_low'
        AND a.resolved_at IS NULL
        AND a.metadata->>'template_name' = b.template_name
    )
  ), ins AS (
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
    SELECT
      'email_delivery_low',
      CASE WHEN f.delivery_rate < 50 THEN 'critical' ELSE 'warning' END,
      'content',
      md5('email_delivery_low:' || f.template_name)::uuid,
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