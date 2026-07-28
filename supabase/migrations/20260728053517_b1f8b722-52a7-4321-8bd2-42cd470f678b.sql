CREATE TABLE public.prerender_recache_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  article_id uuid,
  url text NOT NULL,
  status_code integer,
  ok boolean NOT NULL DEFAULT false,
  detail text,
  source text NOT NULL DEFAULT 'consume-seo-dirty'
);

GRANT ALL ON public.prerender_recache_log TO service_role;
GRANT SELECT ON public.prerender_recache_log TO authenticated;

ALTER TABLE public.prerender_recache_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read prerender_recache_log"
ON public.prerender_recache_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages prerender_recache_log"
ON public.prerender_recache_log TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX idx_prerender_recache_log_recent ON public.prerender_recache_log (created_at DESC);