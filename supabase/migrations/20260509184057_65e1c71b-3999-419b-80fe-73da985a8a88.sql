
-- 1) Add message_id to journey_step_log to correlate engagement events
ALTER TABLE public.journey_step_log
  ADD COLUMN IF NOT EXISTS message_id uuid;

CREATE INDEX IF NOT EXISTS idx_journey_step_log_message_id
  ON public.journey_step_log(message_id)
  WHERE message_id IS NOT NULL;

-- 2) Engagement events table
CREATE TABLE IF NOT EXISTS public.email_engagement_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('open','click')),
  target_url text,
  user_agent text,
  ip_prefix text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eee_message_id
  ON public.email_engagement_events(message_id);
CREATE INDEX IF NOT EXISTS idx_eee_created_at
  ON public.email_engagement_events(created_at DESC);

-- Only one "open" counted per message
CREATE UNIQUE INDEX IF NOT EXISTS uniq_eee_open_per_message
  ON public.email_engagement_events(message_id)
  WHERE event_type = 'open';

ALTER TABLE public.email_engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read engagement events"
  ON public.email_engagement_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
-- No INSERT/UPDATE/DELETE policies: only service_role (which bypasses RLS) can write.
