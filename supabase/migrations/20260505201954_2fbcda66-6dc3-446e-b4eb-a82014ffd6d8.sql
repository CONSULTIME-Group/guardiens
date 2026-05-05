ALTER TABLE public.sitter_profiles
  ADD COLUMN IF NOT EXISTS dog_sizes_accepted text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS demanding_breeds_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS indoor_cats_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS own_animals text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS guard_experience text NOT NULL DEFAULT '';