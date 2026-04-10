
CREATE TABLE public.mass_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  segment text NOT NULL,
  filters jsonb DEFAULT '{}',
  subject text NOT NULL,
  body text NOT NULL,
  cta_label text,
  cta_url text,
  recipients_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  sent_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.mass_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on mass_emails"
  ON public.mass_emails
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
