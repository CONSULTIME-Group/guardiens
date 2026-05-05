ALTER TABLE public.skills_library
  ADD COLUMN IF NOT EXISTS ai_verdict text,
  ADD COLUMN IF NOT EXISTS ai_reason text,
  ADD COLUMN IF NOT EXISTS ai_duplicate_of_label text,
  ADD COLUMN IF NOT EXISTS ai_suggested_label text,
  ADD COLUMN IF NOT EXISTS ai_checked_at timestamptz;