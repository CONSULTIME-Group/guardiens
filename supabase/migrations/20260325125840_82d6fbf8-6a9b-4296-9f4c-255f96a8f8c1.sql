
-- Drop sublet tables
DROP TABLE IF EXISTS public.sublet_applications CASCADE;
DROP TABLE IF EXISTS public.sublets CASCADE;

-- Drop sublet-specific enums
DROP TYPE IF EXISTS public.price_type CASCADE;
DROP TYPE IF EXISTS public.sublet_access_level CASCADE;
DROP TYPE IF EXISTS public.sublet_status CASCADE;

-- Create long_stay_access_level enum
CREATE TYPE public.long_stay_access_level AS ENUM ('eligible', 'past_sitters', 'invite_only');

-- Create long_stay_status enum
CREATE TYPE public.long_stay_status AS ENUM ('draft', 'published', 'confirmed', 'completed', 'cancelled');

-- Create long_stays table
CREATE TABLE public.long_stays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  title TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  estimated_contribution TEXT,
  conditions TEXT DEFAULT '',
  access_level public.long_stay_access_level NOT NULL DEFAULT 'eligible',
  status public.long_stay_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create long_stay_applications table
CREATE TABLE public.long_stay_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  long_stay_id UUID NOT NULL REFERENCES public.long_stays(id),
  sitter_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT DEFAULT '',
  status public.application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS on long_stays
ALTER TABLE public.long_stays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their long stays"
  ON public.long_stays FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Published long stays viewable by authenticated"
  ON public.long_stays FOR SELECT
  TO authenticated
  USING (status <> 'draft' OR auth.uid() = user_id);

-- RLS on long_stay_applications
ALTER TABLE public.long_stay_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sitters can create long stay applications"
  ON public.long_stay_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sitter_id);

CREATE POLICY "Applicants and owners can view"
  ON public.long_stay_applications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sitter_id
    OR EXISTS (
      SELECT 1 FROM public.long_stays
      WHERE long_stays.id = long_stay_applications.long_stay_id
      AND long_stays.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and sitters can update status"
  ON public.long_stay_applications FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = sitter_id
    OR EXISTS (
      SELECT 1 FROM public.long_stays
      WHERE long_stays.id = long_stay_applications.long_stay_id
      AND long_stays.user_id = auth.uid()
    )
  );
