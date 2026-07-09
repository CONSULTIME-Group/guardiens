
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flags publiquement lisibles"
  ON public.feature_flags FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Seuls les admins peuvent modifier les flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.feature_flags (key, enabled, description)
VALUES (
  'mandatory_affinity_onboarding',
  true,
  'Force les nouveaux inscrits à compléter les champs d''affinité (animaux, présence, type de gardien) avant l''accès au dashboard.'
)
ON CONFLICT (key) DO NOTHING;
