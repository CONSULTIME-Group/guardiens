
ALTER TABLE public.emergency_sitter_profiles 
  ADD COLUMN IF NOT EXISTS refusal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_until timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interventions_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.sits 
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;
