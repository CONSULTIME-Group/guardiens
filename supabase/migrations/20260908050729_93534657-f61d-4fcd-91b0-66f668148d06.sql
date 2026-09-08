CREATE TABLE IF NOT EXISTS public.prerender_family_state (
  family text PRIMARY KEY,
  last_hash text,
  last_global_hash text,
  last_marked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prerender_family_state TO authenticated;
GRANT ALL ON public.prerender_family_state TO service_role;
ALTER TABLE public.prerender_family_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read prerender family state" ON public.prerender_family_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.prerender_mark_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decided_at timestamptz NOT NULL DEFAULT now(),
  family text NOT NULL,
  reason text NOT NULL,
  previous_hash text,
  new_hash text,
  previous_global_hash text,
  new_global_hash text,
  days_since_last_mark numeric,
  marked_rows integer NOT NULL DEFAULT 0,
  bundle_fingerprint text,
  detail text
);
CREATE INDEX IF NOT EXISTS idx_prerender_mark_decisions_decided_at ON public.prerender_mark_decisions (decided_at DESC);
GRANT SELECT ON public.prerender_mark_decisions TO authenticated;
GRANT ALL ON public.prerender_mark_decisions TO service_role;
ALTER TABLE public.prerender_mark_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read prerender mark decisions" ON public.prerender_mark_decisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));