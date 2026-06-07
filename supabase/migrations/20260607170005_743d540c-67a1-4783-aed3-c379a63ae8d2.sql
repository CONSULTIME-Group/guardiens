CREATE TABLE public.indexnow_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  url_count INTEGER NOT NULL,
  sample_urls TEXT[] NOT NULL DEFAULT '{}',
  status_code INTEGER,
  ok BOOLEAN NOT NULL DEFAULT false,
  source TEXT,
  triggered_by UUID,
  response_snippet TEXT
);

GRANT SELECT ON public.indexnow_submissions TO authenticated;
GRANT ALL ON public.indexnow_submissions TO service_role;

ALTER TABLE public.indexnow_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view indexnow history"
  ON public.indexnow_submissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_indexnow_submissions_submitted_at
  ON public.indexnow_submissions (submitted_at DESC);