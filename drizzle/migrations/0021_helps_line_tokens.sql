CREATE TABLE public.helps_line_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  revoked_at timestamptz NULL
);
GRANT ALL ON public.helps_line_tokens TO service_role;
ALTER TABLE public.helps_line_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_helps_line_tokens_token ON public.helps_line_tokens(token);
CREATE INDEX idx_helps_line_tokens_profile ON public.helps_line_tokens(profile_id);
COMMENT ON TABLE public.helps_line_tokens IS 'Liens « ma ligne » (30 jours, réutilisables, révocables via revoked_at). Accès service_role uniquement, via edge ma-ligne.';