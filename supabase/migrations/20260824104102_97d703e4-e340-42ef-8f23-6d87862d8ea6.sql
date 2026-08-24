-- Ajout du scope aux redirections : la table sert desormais aux articles
-- (scope article) et aux pages villes (scope city). Les lignes existantes
-- gardent le scope article via le DEFAULT, elles ne sont pas modifiees.
ALTER TABLE public.redirects
  ADD COLUMN scope text NOT NULL DEFAULT 'article';

ALTER TABLE public.redirects
  ADD CONSTRAINT redirects_scope_chk CHECK (scope IN ('article', 'city'));

-- L'unicite porte sur le couple (scope, slug_from) : un meme slug nu peut
-- exister en redirection article et en redirection ville sans conflit.
ALTER TABLE public.redirects DROP CONSTRAINT redirects_pkey;
ALTER TABLE public.redirects ADD CONSTRAINT redirects_pkey PRIMARY KEY (scope, slug_from);

-- RPC de comptage : la signature historique (slug seul) reste utilisable et
-- ne compte que le scope article, ce qui preserve l'edge function existante.
CREATE OR REPLACE FUNCTION public.increment_redirect_hit(p_slug_from text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.redirects
  SET hit_count = hit_count + 1, last_hit_at = now()
  WHERE scope = 'article' AND slug_from = p_slug_from;
$$;

-- Variante avec scope explicite pour les redirections ville.
CREATE OR REPLACE FUNCTION public.increment_redirect_hit(p_slug_from text, p_scope text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.redirects
  SET hit_count = hit_count + 1, last_hit_at = now()
  WHERE scope = p_scope AND slug_from = p_slug_from;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_redirect_hit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_redirect_hit(text, text) TO service_role;

-- Consolidation Tahiti : six communes regroupees sur la page ile (301).
INSERT INTO public.redirects (scope, slug_from, slug_to, redirect_type, notes) VALUES
  ('city', 'faaa', 'tahiti', 301, 'Consolidation Tahiti : six communes sans gardien resident regroupees sur la page ile, aout 2026'),
  ('city', 'punaauia', 'tahiti', 301, 'Consolidation Tahiti : six communes sans gardien resident regroupees sur la page ile, aout 2026'),
  ('city', 'pirae', 'tahiti', 301, 'Consolidation Tahiti : six communes sans gardien resident regroupees sur la page ile, aout 2026'),
  ('city', 'mahina', 'tahiti', 301, 'Consolidation Tahiti : six communes sans gardien resident regroupees sur la page ile, aout 2026'),
  ('city', 'paea', 'tahiti', 301, 'Consolidation Tahiti : six communes sans gardien resident regroupees sur la page ile, aout 2026'),
  ('city', 'taiarapu-est', 'tahiti', 301, 'Consolidation Tahiti : six communes sans gardien resident regroupees sur la page ile, aout 2026');