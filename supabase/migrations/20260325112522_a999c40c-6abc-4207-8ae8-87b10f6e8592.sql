
-- Breed profiles table
CREATE TABLE public.breed_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species text NOT NULL,
  breed text NOT NULL,
  temperament text NOT NULL DEFAULT '',
  exercise_needs text NOT NULL DEFAULT '',
  grooming text NOT NULL DEFAULT '',
  stranger_behavior text NOT NULL DEFAULT '',
  sitter_tips text NOT NULL DEFAULT '',
  ideal_for text NOT NULL DEFAULT '',
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(species, breed)
);

ALTER TABLE public.breed_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read breed profiles"
  ON public.breed_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert breed profiles"
  ON public.breed_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Location profiles table
CREATE TABLE public.location_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  postal_code text NOT NULL,
  neighborhood_type text NOT NULL DEFAULT '',
  nature_access text NOT NULL DEFAULT '',
  amenities text NOT NULL DEFAULT '',
  transport text NOT NULL DEFAULT '',
  activities text NOT NULL DEFAULT '',
  ideal_for text NOT NULL DEFAULT '',
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(postal_code)
);

ALTER TABLE public.location_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read location profiles"
  ON public.location_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert location profiles"
  ON public.location_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add owner_note to pets table for personal breed nuance
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS owner_breed_note text DEFAULT '';
