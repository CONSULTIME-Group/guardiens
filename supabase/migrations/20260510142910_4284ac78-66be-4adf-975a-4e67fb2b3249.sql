CREATE TABLE public.redirects (
  slug_from text PRIMARY KEY,
  slug_to text NOT NULL,
  redirect_type smallint NOT NULL DEFAULT 301,
  notes text,
  hit_count bigint NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT redirects_type_chk CHECK (redirect_type IN (301, 302, 308)),
  CONSTRAINT redirects_no_self CHECK (slug_from <> slug_to),
  CONSTRAINT redirects_slug_from_format CHECK (slug_from ~ '^[a-z0-9-]+$'),
  CONSTRAINT redirects_slug_to_format CHECK (slug_to ~ '^[a-z0-9-]+$')
);

CREATE INDEX redirects_slug_to_idx ON public.redirects(slug_to);

ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

-- Lecture publique (anon + authenticated) pour résolution navigateur
CREATE POLICY "Redirects are publicly readable"
  ON public.redirects FOR SELECT
  USING (true);

-- Écriture réservée admin
CREATE POLICY "Admins can insert redirects"
  ON public.redirects FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update redirects"
  ON public.redirects FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete redirects"
  ON public.redirects FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER redirects_updated_at
  BEFORE UPDATE ON public.redirects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC pour incrémenter le compteur (appelée par l'edge function en service_role)
CREATE OR REPLACE FUNCTION public.increment_redirect_hit(p_slug_from text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.redirects
  SET hit_count = hit_count + 1, last_hit_at = now()
  WHERE slug_from = p_slug_from;
$$;