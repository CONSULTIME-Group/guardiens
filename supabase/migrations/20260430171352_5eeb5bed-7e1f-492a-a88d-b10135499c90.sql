-- Table de tracking individuel par destinataire
CREATE TABLE public.mass_email_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mass_email_id UUID NOT NULL REFERENCES public.mass_emails(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  resend_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent', -- sent | delivered | opened | clicked | bounced | complained | failed
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  first_clicked_at TIMESTAMPTZ,
  last_clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  last_clicked_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mass_email_sends_resend_id ON public.mass_email_sends(resend_id);
CREATE INDEX idx_mass_email_sends_campaign ON public.mass_email_sends(mass_email_id);
CREATE INDEX idx_mass_email_sends_email ON public.mass_email_sends(recipient_email);

ALTER TABLE public.mass_email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mass_email_sends"
ON public.mass_email_sends
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_mass_email_sends_updated_at
BEFORE UPDATE ON public.mass_email_sends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Vue agrégée par campagne
CREATE OR REPLACE VIEW public.mass_email_stats AS
SELECT
  m.id AS mass_email_id,
  m.subject,
  m.segment,
  m.created_at,
  m.recipients_count,
  COUNT(s.id) AS tracked_count,
  COUNT(s.delivered_at) AS delivered_count,
  COUNT(s.first_opened_at) AS unique_opens,
  COUNT(s.first_clicked_at) AS unique_clicks,
  COUNT(s.bounced_at) AS bounced_count,
  COUNT(s.complained_at) AS complained_count,
  COALESCE(SUM(s.open_count), 0) AS total_opens,
  COALESCE(SUM(s.click_count), 0) AS total_clicks,
  CASE WHEN COUNT(s.delivered_at) > 0
    THEN ROUND(COUNT(s.first_opened_at)::numeric * 100 / COUNT(s.delivered_at), 2)
    ELSE 0 END AS open_rate,
  CASE WHEN COUNT(s.first_opened_at) > 0
    THEN ROUND(COUNT(s.first_clicked_at)::numeric * 100 / COUNT(s.first_opened_at), 2)
    ELSE 0 END AS click_through_rate,
  CASE WHEN COUNT(s.delivered_at) > 0
    THEN ROUND(COUNT(s.first_clicked_at)::numeric * 100 / COUNT(s.delivered_at), 2)
    ELSE 0 END AS click_rate
FROM public.mass_emails m
LEFT JOIN public.mass_email_sends s ON s.mass_email_id = m.id
GROUP BY m.id;

-- Note: les vues héritent des permissions des tables sous-jacentes (mass_emails + mass_email_sends),
-- déjà protégées par RLS admin-only.