
CREATE TABLE public.email_delivery_thresholds (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bounce_pct_max numeric NOT NULL DEFAULT 5,
  open_pct_min numeric NOT NULL DEFAULT 15,
  complaint_pct_max numeric NOT NULL DEFAULT 0.1,
  min_sends integer NOT NULL DEFAULT 10,
  window_days integer NOT NULL DEFAULT 7,
  alert_enabled boolean NOT NULL DEFAULT true,
  alert_recipient text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.email_delivery_thresholds TO authenticated;
GRANT ALL ON public.email_delivery_thresholds TO service_role;
ALTER TABLE public.email_delivery_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read thresholds" ON public.email_delivery_thresholds FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update thresholds" ON public.email_delivery_thresholds FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.email_delivery_thresholds (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.email_delivery_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  window_days integer NOT NULL,
  total_sent integer NOT NULL DEFAULT 0,
  total_delivered integer NOT NULL DEFAULT 0,
  total_opened integer NOT NULL DEFAULT 0,
  total_clicked integer NOT NULL DEFAULT 0,
  total_bounced integer NOT NULL DEFAULT 0,
  total_complained integer NOT NULL DEFAULT 0,
  bounce_rate numeric NOT NULL DEFAULT 0,
  open_rate numeric NOT NULL DEFAULT 0,
  click_rate numeric NOT NULL DEFAULT 0,
  complaint_rate numeric NOT NULL DEFAULT 0,
  breaches jsonb NOT NULL DEFAULT '[]'::jsonb,
  per_template jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_date, window_days)
);
GRANT SELECT ON public.email_delivery_snapshots TO authenticated;
GRANT ALL ON public.email_delivery_snapshots TO service_role;
ALTER TABLE public.email_delivery_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read snapshots" ON public.email_delivery_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX email_delivery_snapshots_date_idx ON public.email_delivery_snapshots (snapshot_date DESC);
