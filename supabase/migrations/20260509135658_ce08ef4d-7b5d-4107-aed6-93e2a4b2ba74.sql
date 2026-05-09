CREATE TABLE public.email_idempotency_hits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  hit_type TEXT NOT NULL CHECK (hit_type IN ('duplicate_send', 'already_queued')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_idem_hits_created_at
  ON public.email_idempotency_hits (created_at DESC);
CREATE INDEX idx_email_idem_hits_template
  ON public.email_idempotency_hits (template_name, created_at DESC);
CREATE INDEX idx_email_idem_hits_key
  ON public.email_idempotency_hits (idempotency_key);

ALTER TABLE public.email_idempotency_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read idempotency hits"
ON public.email_idempotency_hits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.email_idempotency_daily_counts AS
SELECT
  date_trunc('day', created_at)::date AS day,
  template_name,
  hit_type,
  count(*)::bigint AS hits
FROM public.email_idempotency_hits
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

GRANT SELECT ON public.email_idempotency_daily_counts TO authenticated;