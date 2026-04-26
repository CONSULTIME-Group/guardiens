ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS expiry_30d_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_7d_sent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry_reminders
  ON public.subscriptions (expires_at)
  WHERE status = 'active' AND (expiry_30d_sent = false OR expiry_7d_sent = false);