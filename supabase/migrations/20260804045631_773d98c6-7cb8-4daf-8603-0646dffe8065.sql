ALTER TABLE public.sits
  ADD COLUMN IF NOT EXISTS absence_reason text,
  ADD COLUMN IF NOT EXISTS sitter_expectations text;