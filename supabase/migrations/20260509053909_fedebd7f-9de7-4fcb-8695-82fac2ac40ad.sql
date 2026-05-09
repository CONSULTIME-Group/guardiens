
CREATE OR REPLACE FUNCTION public.admin_get_signup_confirmations(p_days integer DEFAULT 7)
RETURNS TABLE (
  message_id text,
  recipient_email text,
  sent_at timestamptz,
  status text,
  error_message text,
  user_id uuid,
  user_created_at timestamptz,
  confirmed_at timestamptz,
  delay_seconds bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (l.message_id)
      l.message_id, l.recipient_email, l.created_at AS sent_at,
      l.status, l.error_message
    FROM public.email_send_log l
    WHERE l.template_name = 'signup'
      AND l.message_id IS NOT NULL
      AND l.created_at >= now() - (p_days || ' days')::interval
    ORDER BY l.message_id, l.created_at DESC
  )
  SELECT
    latest.message_id,
    latest.recipient_email,
    latest.sent_at,
    latest.status,
    latest.error_message,
    u.id AS user_id,
    u.created_at AS user_created_at,
    u.email_confirmed_at AS confirmed_at,
    CASE
      WHEN u.email_confirmed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (u.email_confirmed_at - latest.sent_at))::bigint
      ELSE NULL
    END AS delay_seconds
  FROM latest
  LEFT JOIN auth.users u
    ON lower(u.email) = lower(latest.recipient_email)
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY latest.sent_at DESC
  LIMIT 1000;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_signup_confirmation_stats(p_days integer DEFAULT 7)
RETURNS TABLE (
  total_sent bigint,
  total_failed bigint,
  total_confirmed bigint,
  total_pending bigint,
  confirmation_rate numeric,
  median_delay_seconds numeric,
  avg_delay_seconds numeric,
  p90_delay_seconds numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT * FROM public.admin_get_signup_confirmations(p_days)
  )
  SELECT
    count(*) FILTER (WHERE status = 'sent')::bigint AS total_sent,
    count(*) FILTER (WHERE status IN ('failed','dlq','bounced'))::bigint AS total_failed,
    count(*) FILTER (WHERE confirmed_at IS NOT NULL)::bigint AS total_confirmed,
    count(*) FILTER (WHERE status = 'sent' AND confirmed_at IS NULL)::bigint AS total_pending,
    CASE WHEN count(*) FILTER (WHERE status = 'sent') > 0
      THEN round(100.0 * count(*) FILTER (WHERE confirmed_at IS NOT NULL)::numeric
                 / count(*) FILTER (WHERE status = 'sent')::numeric, 1)
      ELSE 0 END AS confirmation_rate,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY delay_seconds) FILTER (WHERE delay_seconds IS NOT NULL AND delay_seconds >= 0) AS median_delay_seconds,
    avg(delay_seconds) FILTER (WHERE delay_seconds IS NOT NULL AND delay_seconds >= 0) AS avg_delay_seconds,
    percentile_cont(0.9) WITHIN GROUP (ORDER BY delay_seconds) FILTER (WHERE delay_seconds IS NOT NULL AND delay_seconds >= 0) AS p90_delay_seconds
  FROM base;
$$;

REVOKE ALL ON FUNCTION public.admin_get_signup_confirmations(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_signup_confirmation_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_signup_confirmations(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_signup_confirmation_stats(integer) TO authenticated;
