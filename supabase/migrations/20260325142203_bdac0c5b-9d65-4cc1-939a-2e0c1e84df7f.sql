CREATE TABLE public.identity_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  result text NOT NULL DEFAULT 'pending',
  document_type text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.identity_verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification logs"
  ON public.identity_verification_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
