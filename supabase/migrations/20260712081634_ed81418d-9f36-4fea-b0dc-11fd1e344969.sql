CREATE TABLE public.admin_activity_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  summary text,
  actions jsonb,
  snapshot jsonb
);

GRANT SELECT ON public.admin_activity_analysis TO authenticated;
GRANT ALL ON public.admin_activity_analysis TO service_role;

ALTER TABLE public.admin_activity_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin activity analyses"
ON public.admin_activity_analysis
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX admin_activity_analysis_generated_at_idx
ON public.admin_activity_analysis (generated_at DESC);