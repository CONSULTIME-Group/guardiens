CREATE TABLE IF NOT EXISTS public.article_refresh_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES public.profiles(id),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  dry_run boolean NOT NULL DEFAULT true,
  before_content_hash text NOT NULL,
  after_content_hash text,
  changes_count integer,
  removed_patterns jsonb,
  warnings jsonb,
  applied boolean NOT NULL DEFAULT false,
  noindex_after boolean,
  gemini_model text,
  input_tokens integer,
  output_tokens integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.article_refresh_logs TO authenticated;
GRANT ALL ON public.article_refresh_logs TO service_role;

ALTER TABLE public.article_refresh_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read refresh logs"
  ON public.article_refresh_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert refresh logs"
  ON public.article_refresh_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_article_refresh_logs_article_id ON public.article_refresh_logs(article_id);
CREATE INDEX IF NOT EXISTS idx_article_refresh_logs_triggered_at ON public.article_refresh_logs(triggered_at DESC);