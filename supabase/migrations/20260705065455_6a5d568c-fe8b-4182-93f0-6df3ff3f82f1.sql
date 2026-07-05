
ALTER TABLE public.small_missions
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS pet_species text,
  ADD COLUMN IF NOT EXISTS pet_size text;
