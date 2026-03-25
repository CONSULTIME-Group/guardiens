-- Enums for sublets
CREATE TYPE public.price_type AS ENUM ('per_night', 'per_week', 'per_month');
CREATE TYPE public.sublet_access_level AS ENUM ('eligible', 'past_sitters', 'invite_only');
CREATE TYPE public.sublet_status AS ENUM ('draft', 'published', 'confirmed', 'completed', 'cancelled');

-- Add identity_verified to profiles
ALTER TABLE public.profiles ADD COLUMN identity_verified boolean NOT NULL DEFAULT false;

-- Sublets table
CREATE TABLE public.sublets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  price_amount numeric NOT NULL DEFAULT 0,
  price_type public.price_type NOT NULL DEFAULT 'per_night',
  conditions text DEFAULT '',
  access_level public.sublet_access_level NOT NULL DEFAULT 'eligible',
  status public.sublet_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sublets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their sublets" ON public.sublets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Published sublets viewable by authenticated" ON public.sublets FOR SELECT TO authenticated
  USING (status != 'draft' OR auth.uid() = user_id);

-- Sublet applications table
CREATE TABLE public.sublet_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sublet_id uuid NOT NULL REFERENCES public.sublets(id) ON DELETE CASCADE,
  sitter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text DEFAULT '',
  status public.application_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sublet_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sitters can create sublet applications" ON public.sublet_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sitter_id);

CREATE POLICY "Applicants and owners can view" ON public.sublet_applications FOR SELECT TO authenticated
  USING (auth.uid() = sitter_id OR EXISTS (
    SELECT 1 FROM public.sublets WHERE sublets.id = sublet_applications.sublet_id AND sublets.user_id = auth.uid()
  ));

CREATE POLICY "Owners and sitters can update status" ON public.sublet_applications FOR UPDATE TO authenticated
  USING (auth.uid() = sitter_id OR EXISTS (
    SELECT 1 FROM public.sublets WHERE sublets.id = sublet_applications.sublet_id AND sublets.user_id = auth.uid()
  ));