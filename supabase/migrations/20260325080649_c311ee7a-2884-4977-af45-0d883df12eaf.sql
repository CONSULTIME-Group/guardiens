
-- Enums
CREATE TYPE public.user_role AS ENUM ('owner', 'sitter', 'both');
CREATE TYPE public.property_type AS ENUM ('apartment', 'house', 'farm', 'chalet', 'other');
CREATE TYPE public.property_environment AS ENUM ('city_center', 'suburban', 'countryside', 'mountain', 'seaside', 'forest');
CREATE TYPE public.pet_species AS ENUM ('dog', 'cat', 'horse', 'bird', 'rodent', 'fish', 'reptile', 'farm_animal', 'nac');
CREATE TYPE public.alone_duration AS ENUM ('never', '2h', '6h', 'all_day');
CREATE TYPE public.walk_duration AS ENUM ('none', '30min', '1h', '2h_plus');
CREATE TYPE public.activity_level AS ENUM ('calm', 'moderate', 'sportive');
CREATE TYPE public.sit_status AS ENUM ('draft', 'published', 'confirmed', 'completed', 'cancelled');
CREATE TYPE public.application_status AS ENUM ('pending', 'viewed', 'discussing', 'accepted', 'rejected', 'cancelled');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role user_role NOT NULL DEFAULT 'sitter',
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  profile_completion INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type property_type NOT NULL DEFAULT 'house',
  environment property_environment DEFAULT 'countryside',
  rooms_count INTEGER DEFAULT 0,
  bedrooms_count INTEGER DEFAULT 0,
  car_required BOOLEAN DEFAULT false,
  accessible BOOLEAN DEFAULT false,
  description TEXT DEFAULT '',
  region_highlights TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Properties are viewable by authenticated users"
  ON public.properties FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can insert their own properties"
  ON public.properties FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their own properties"
  ON public.properties FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete their own properties"
  ON public.properties FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Pets table
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  species pet_species NOT NULL DEFAULT 'dog',
  breed TEXT DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  age INTEGER,
  photo_url TEXT,
  character TEXT DEFAULT '',
  alone_duration alone_duration DEFAULT 'never',
  walk_duration walk_duration DEFAULT 'none',
  medication TEXT DEFAULT '',
  food TEXT DEFAULT '',
  special_needs TEXT DEFAULT '',
  activity_level activity_level DEFAULT 'moderate'
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pets are viewable by authenticated users"
  ON public.pets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can manage their pets"
  ON public.pets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties WHERE id = property_id AND user_id = auth.uid()
  ));

CREATE POLICY "Owners can update their pets"
  ON public.pets FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.properties WHERE id = property_id AND user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete their pets"
  ON public.pets FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.properties WHERE id = property_id AND user_id = auth.uid()
  ));

-- Sits table
CREATE TABLE public.sits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  flexible_dates BOOLEAN DEFAULT false,
  specific_expectations TEXT DEFAULT '',
  open_to TEXT[] DEFAULT '{}',
  status sit_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published sits are viewable by authenticated users"
  ON public.sits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can insert their own sits"
  ON public.sits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their own sits"
  ON public.sits FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete their own sits"
  ON public.sits FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sit_id UUID NOT NULL REFERENCES public.sits(id) ON DELETE CASCADE,
  sitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT DEFAULT '',
  status application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sitters can view their own applications"
  ON public.applications FOR SELECT TO authenticated
  USING (
    auth.uid() = sitter_id
    OR EXISTS (SELECT 1 FROM public.sits WHERE id = sit_id AND user_id = auth.uid())
  );

CREATE POLICY "Sitters can create applications"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sitter_id);

CREATE POLICY "Application owners can update status"
  ON public.applications FOR UPDATE TO authenticated
  USING (
    auth.uid() = sitter_id
    OR EXISTS (SELECT 1 FROM public.sits WHERE id = sit_id AND user_id = auth.uid())
  );

-- Reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sit_id UUID NOT NULL REFERENCES public.sits(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  comment TEXT DEFAULT '',
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published reviews are viewable by authenticated users"
  ON public.reviews FOR SELECT TO authenticated
  USING (published = true OR auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

CREATE POLICY "Users can create reviews for their sits"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update their own reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id);

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
