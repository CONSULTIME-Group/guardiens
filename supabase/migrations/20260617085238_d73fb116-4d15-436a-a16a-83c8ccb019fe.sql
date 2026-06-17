CREATE TABLE public.sit_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sit_id uuid NOT NULL REFERENCES public.sits(id) ON DELETE CASCADE,
  viewer_id uuid NULL,
  session_id text NULL,
  referrer text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sit_views_sit_id ON public.sit_views(sit_id);
CREATE INDEX idx_sit_views_created_at ON public.sit_views(created_at DESC);

GRANT SELECT, INSERT ON public.sit_views TO authenticated;
GRANT SELECT, INSERT ON public.sit_views TO anon;
GRANT ALL ON public.sit_views TO service_role;

ALTER TABLE public.sit_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a view"
  ON public.sit_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Owner can read own sit views"
  ON public.sit_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sits s
      WHERE s.id = sit_views.sit_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all sit views"
  ON public.sit_views FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_sit_view(
  p_sit_id uuid,
  p_session_id text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sit_views (sit_id, viewer_id, session_id, referrer, user_agent)
  VALUES (p_sit_id, auth.uid(), p_session_id, left(coalesce(p_referrer, ''), 500), left(coalesce(p_user_agent, ''), 500));
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_sit_view(uuid, text, text, text) TO anon, authenticated;

CREATE OR REPLACE VIEW public.sit_view_counts AS
SELECT sit_id, count(*)::bigint AS views_total,
       count(*) FILTER (WHERE created_at > now() - interval '7 days')::bigint AS views_7d,
       count(*) FILTER (WHERE created_at > now() - interval '30 days')::bigint AS views_30d
FROM public.sit_views
GROUP BY sit_id;

GRANT SELECT ON public.sit_view_counts TO authenticated;
GRANT SELECT ON public.sit_view_counts TO service_role;