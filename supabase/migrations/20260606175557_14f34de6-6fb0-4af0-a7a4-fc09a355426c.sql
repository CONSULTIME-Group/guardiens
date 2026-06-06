
CREATE TABLE public.moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('sit','message','bio')),
  status text NOT NULL CHECK (status IN ('ok','warning','block')),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX moderation_logs_user_idx ON public.moderation_logs(user_id, created_at DESC);
CREATE INDEX moderation_logs_status_idx ON public.moderation_logs(status, created_at DESC);

GRANT SELECT, INSERT ON public.moderation_logs TO authenticated;
GRANT ALL ON public.moderation_logs TO service_role;

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own moderation logs"
  ON public.moderation_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users insert own moderation logs"
  ON public.moderation_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
