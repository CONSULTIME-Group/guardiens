ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS unread_reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_conv_unread_reminder
  ON public.conversations(unread_reminder_sent_at);