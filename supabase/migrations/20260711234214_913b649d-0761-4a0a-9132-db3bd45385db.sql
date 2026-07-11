
ALTER TABLE public.small_missions
  ADD COLUMN IF NOT EXISTS hidden_by uuid,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_small_missions_hidden_by ON public.small_missions(hidden_by) WHERE hidden_by IS NOT NULL;
