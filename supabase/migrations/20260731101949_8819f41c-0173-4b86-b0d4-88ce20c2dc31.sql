INSERT INTO public.suppressed_emails (email, reason, metadata)
SELECT DISTINCT lower(l.recipient_email),
       CASE WHEN l.complained_at IS NOT NULL THEN 'complaint' ELSE 'bounce' END,
       jsonb_build_object('source', 'backfill_email_send_log')
FROM public.email_send_log l
WHERE (l.bounced_at IS NOT NULL OR l.complained_at IS NOT NULL)
  AND l.recipient_email IS NOT NULL
ON CONFLICT (email) DO NOTHING;