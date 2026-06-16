ALTER TABLE public.sitter_profiles
  ADD COLUMN IF NOT EXISTS special_animal_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_during_sit text,
  ADD COLUMN IF NOT EXISTS sensitivities text[] NOT NULL DEFAULT '{}';