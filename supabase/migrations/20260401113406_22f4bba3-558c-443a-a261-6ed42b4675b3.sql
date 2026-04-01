ALTER TABLE public.sitter_profiles
  ADD COLUMN IF NOT EXISTS min_stay_duration text DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS preferred_frequency text DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS min_notice text DEFAULT 'asap',
  ADD COLUMN IF NOT EXISTS preferred_periods text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_environments text[] DEFAULT '{}';