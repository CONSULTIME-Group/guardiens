CREATE TABLE public.email_campaign_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'mission_created')),
  utm_campaign TEXT NOT NULL,
  utm_content TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  user_id UUID,
  mission_id UUID,
  path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert campaign events"
  ON public.email_campaign_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read campaign events"
  ON public.email_campaign_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_email_campaign_events_campaign_created
  ON public.email_campaign_events (utm_campaign, created_at DESC);

CREATE INDEX idx_email_campaign_events_type_created
  ON public.email_campaign_events (event_type, created_at DESC);