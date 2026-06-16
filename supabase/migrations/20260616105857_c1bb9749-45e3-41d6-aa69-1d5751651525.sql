ALTER TABLE public.sitter_profiles
  ADD COLUMN IF NOT EXISTS life_pace text,
  ADD COLUMN IF NOT EXISTS household_composition text[] DEFAULT '{}'::text[];

ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS life_pace text,
  ADD COLUMN IF NOT EXISTS household_composition text[] DEFAULT '{}'::text[];