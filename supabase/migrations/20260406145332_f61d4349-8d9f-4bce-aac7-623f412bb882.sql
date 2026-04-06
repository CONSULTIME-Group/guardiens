-- Make sit_id nullable to allow mission reviews
ALTER TABLE public.reviews ALTER COLUMN sit_id DROP NOT NULL;

-- Add mission_id column for mission reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES public.small_missions(id) ON DELETE CASCADE;

-- Ensure each review has either a sit_id or a mission_id
ALTER TABLE public.reviews ADD CONSTRAINT reviews_sit_or_mission_check
  CHECK (sit_id IS NOT NULL OR mission_id IS NOT NULL);