
-- === Modération admin : colonnes de traçabilité + table d'audit ===

-- 1. reports : action prise + admin acteur
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS action_taken text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. profiles : suspension explicite (on garde account_status='suspended' en miroir applicatif)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- 3. sits : masquage modération (n'écrase pas l'enum status, dédié à la modération)
ALTER TABLE public.sits
  ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. small_missions : idem
ALTER TABLE public.small_missions
  ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. reviews : réutilise moderation_status existant + acteur
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS moderation_hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz;

-- 6. messages : pas de colonne modération existante — on ajoute
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. Table d'audit admin_action_logs
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  note text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_action_logs TO authenticated;
GRANT ALL ON public.admin_action_logs TO service_role;

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read admin_action_logs" ON public.admin_action_logs;
CREATE POLICY "Admins can read admin_action_logs"
  ON public.admin_action_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert admin_action_logs" ON public.admin_action_logs;
CREATE POLICY "Admins can insert admin_action_logs"
  ON public.admin_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON public.admin_action_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_report_id ON public.admin_action_logs (report_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id ON public.admin_action_logs (admin_id);
