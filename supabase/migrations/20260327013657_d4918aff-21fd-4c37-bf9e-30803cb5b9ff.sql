ALTER TABLE public.breed_profiles 
  ADD COLUMN IF NOT EXISTS alimentation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS health_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS compatibility text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS difficulty_level text NOT NULL DEFAULT '';

-- Clear existing cached profiles so they regenerate with new fields
DELETE FROM public.breed_profiles;