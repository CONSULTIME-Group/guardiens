
-- 1. Catalogue des séquences
CREATE TABLE public.nurturing_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  audience text NOT NULL CHECK (audience IN ('sitter', 'owner', 'both', 'all')),
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Étapes d'une séquence
CREATE TABLE public.nurturing_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.nurturing_sequences(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  delay_hours int NOT NULL,
  template_name text NOT NULL,
  exit_condition jsonb DEFAULT '{}'::jsonb,
  send_condition jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, step_order)
);
CREATE INDEX idx_nurturing_steps_sequence ON public.nurturing_steps(sequence_id, step_order);

-- 3. Parcours utilisateur
CREATE TABLE public.user_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sequence_key text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'exited', 'paused')),
  current_step int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_step_at timestamptz,
  completed_at timestamptz,
  exit_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sequence_key)
);
CREATE INDEX idx_user_journeys_status ON public.user_journeys(status, sequence_key);
CREATE INDEX idx_user_journeys_user ON public.user_journeys(user_id);

-- 4. Log d'exécution par étape
CREATE TABLE public.journey_step_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.user_journeys(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  template_name text NOT NULL,
  sent boolean NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_journey_step_log_journey ON public.journey_step_log(journey_id, created_at DESC);

-- Triggers updated_at
CREATE TRIGGER trg_nurturing_sequences_updated BEFORE UPDATE ON public.nurturing_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_journeys_updated BEFORE UPDATE ON public.user_journeys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.nurturing_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurturing_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_step_log ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage sequences" ON public.nurturing_sequences
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage steps" ON public.nurturing_steps
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read journeys" ON public.user_journeys
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read journey log" ON public.journey_step_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Users see their own journeys
CREATE POLICY "Users read own journeys" ON public.user_journeys
  FOR SELECT USING (auth.uid() = user_id);

-- Catalogue lisible par tous (utile pour préférences futures)
CREATE POLICY "Sequences readable" ON public.nurturing_sequences
  FOR SELECT USING (active = true);
CREATE POLICY "Steps readable" ON public.nurturing_steps
  FOR SELECT USING (true);

-- Seed catalogue : 2 séquences d'onboarding
INSERT INTO public.nurturing_sequences (key, audience, description) VALUES
  ('onboarding-sitter', 'sitter', 'Accompagnement gardien : compléter son profil, candidater, devenir Super Gardien'),
  ('onboarding-owner', 'owner', 'Accompagnement propriétaire : publier son annonce, choisir un gardien, finaliser une garde');

-- Seed étapes sitter
INSERT INTO public.nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition)
SELECT id, 1, 24,  'onboarding-j1',                '{"type":"profile_complete","threshold":60}'::jsonb FROM public.nurturing_sequences WHERE key = 'onboarding-sitter'
UNION ALL SELECT id, 2, 72,  'relance-profil-incomplet',     '{"type":"profile_complete","threshold":80}'::jsonb FROM public.nurturing_sequences WHERE key = 'onboarding-sitter'
UNION ALL SELECT id, 3, 168, 'availability-nudge',           '{"type":"has_application"}'::jsonb                 FROM public.nurturing_sequences WHERE key = 'onboarding-sitter'
UNION ALL SELECT id, 4, 336, 'conseils-annonce-personnalises','{"type":"has_completed_sit"}'::jsonb              FROM public.nurturing_sequences WHERE key = 'onboarding-sitter';

-- Seed étapes owner
INSERT INTO public.nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition)
SELECT id, 1, 24,  'onboarding-j1',                  '{"type":"profile_complete","threshold":60}'::jsonb FROM public.nurturing_sequences WHERE key = 'onboarding-owner'
UNION ALL SELECT id, 2, 72,  'conseils-publication-annonce',   '{"type":"has_published_sit"}'::jsonb               FROM public.nurturing_sequences WHERE key = 'onboarding-owner'
UNION ALL SELECT id, 3, 168, 'conseils-annonce-personnalises', '{"type":"has_application_received"}'::jsonb        FROM public.nurturing_sequences WHERE key = 'onboarding-owner'
UNION ALL SELECT id, 4, 336, 'relance-profil-incomplet',       '{"type":"profile_complete","threshold":80}'::jsonb FROM public.nurturing_sequences WHERE key = 'onboarding-owner';
