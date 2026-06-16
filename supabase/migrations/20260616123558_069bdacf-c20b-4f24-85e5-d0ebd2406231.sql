ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS home_ambiance text[] NOT NULL DEFAULT '{}';