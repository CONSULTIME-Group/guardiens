-- Lot ERR2 (22/10/2026, demande de Jérémie : « fais tout ») : une erreur de
-- /admin/errors se confie à Claude depuis l'admin, sans copier-coller.
-- 1. fix_requested_at, fix_requested_by : posés par le bouton « Confier à
--    Claude » (politique admin_update_error_logs existante, admin seul).
-- 2. fix_attempted_at, fix_pr_url : écrits par la tâche planifiée qui reprend
--    chaque matin les demandes ouvertes (diagnostic, correctif, PR, note dans
--    admin_notes). La fusion et la résolution restent des gestes de Jérémie.
-- 3. Index partiel des demandes en attente, lu par la tâche planifiée.
-- Aucune donnée existante modifiée. Rejouable.
ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS fix_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS fix_requested_by uuid,
  ADD COLUMN IF NOT EXISTS fix_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS fix_pr_url text;

COMMENT ON COLUMN public.error_logs.fix_requested_at IS
  'Lot ERR2 : correction confiée à Claude depuis /admin/errors.';
COMMENT ON COLUMN public.error_logs.fix_attempted_at IS
  'Lot ERR2 : dernier passage de la tâche planifiée sur cette demande.';
COMMENT ON COLUMN public.error_logs.fix_pr_url IS
  'Lot ERR2 : PR ouverte par la tâche planifiée (fusion par Jérémie).';

CREATE INDEX IF NOT EXISTS error_logs_fix_pending_idx
  ON public.error_logs (fix_requested_at)
  WHERE fix_requested_at IS NOT NULL AND resolved_at IS NULL;
