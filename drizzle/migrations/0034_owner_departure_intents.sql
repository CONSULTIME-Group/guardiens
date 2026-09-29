CREATE TABLE public.owner_departure_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period text NOT NULL,
  source text NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_departure_intents_period_chk CHECK (period IN ('noel','hiver','printemps','ete','plus_tard')),
  CONSTRAINT owner_departure_intents_source_chk CHECK (source IN ('email','dashboard','message'))
);
GRANT SELECT, INSERT ON public.owner_departure_intents TO authenticated;
GRANT ALL ON public.owner_departure_intents TO service_role;
ALTER TABLE public.owner_departure_intents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_owner_departure_intents_user ON public.owner_departure_intents(user_id, answered_at DESC);
CREATE POLICY "Membre lit ses reponses de depart" ON public.owner_departure_intents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Membre ajoute ses reponses de depart" ON public.owner_departure_intents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin lit les reponses de depart" ON public.owner_departure_intents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.owner_departure_intents IS 'Reponses a la question « Vous partez quand ? » (lot N4). Une reponse ajoute une ligne, la periode courante est la derniere.';

CREATE TABLE public.departure_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  revoked_at timestamptz NULL
);
GRANT ALL ON public.departure_tokens TO service_role;
ALTER TABLE public.departure_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_departure_tokens_profile ON public.departure_tokens(profile_id);
COMMENT ON TABLE public.departure_tokens IS 'Liens « ma periode » (30 jours, reutilisables, revocables via revoked_at). Acces service_role uniquement, via la fonction ma-periode.';