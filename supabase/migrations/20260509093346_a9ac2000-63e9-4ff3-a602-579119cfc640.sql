
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS resend_id text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_clicked_url text,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz;

CREATE INDEX IF NOT EXISTS email_send_log_resend_id_idx
  ON public.email_send_log(resend_id) WHERE resend_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_send_log_recipient_created_idx
  ON public.email_send_log(recipient_email, created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_deferred_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  defer_reason text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_error text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_deferred_queue_due_idx
  ON public.email_deferred_queue(scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS email_deferred_queue_recipient_idx
  ON public.email_deferred_queue(recipient_email, status);

ALTER TABLE public.email_deferred_queue ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_email_deferred_queue_updated_at ON public.email_deferred_queue;
CREATE TRIGGER update_email_deferred_queue_updated_at
  BEFORE UPDATE ON public.email_deferred_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
