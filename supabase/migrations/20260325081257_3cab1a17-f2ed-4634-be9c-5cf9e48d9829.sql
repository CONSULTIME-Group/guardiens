
-- Sitter profiles table for all gardien-specific data
CREATE TABLE public.sitter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivation TEXT DEFAULT '',
  sitter_type TEXT DEFAULT '',
  accompanied_by TEXT DEFAULT '',
  smoker BOOLEAN DEFAULT false,
  availability_during TEXT DEFAULT '',
  lifestyle TEXT[] DEFAULT '{}',
  animal_types TEXT[] DEFAULT '{}',
  experience_years TEXT DEFAULT '',
  references_text TEXT DEFAULT '',
  has_license BOOLEAN DEFAULT false,
  has_vehicle BOOLEAN DEFAULT false,
  geographic_radius INTEGER DEFAULT 30,
  min_duration INTEGER DEFAULT 3,
  max_duration INTEGER DEFAULT 21,
  availability_dates JSONB DEFAULT '[]',
  strict_rules_ok BOOLEAN DEFAULT false,
  prefer_visitors BOOLEAN DEFAULT false,
  farm_animals_ok BOOLEAN DEFAULT false,
  preferences_notes TEXT DEFAULT '',
  meeting_preference TEXT[] DEFAULT '{}',
  handover_preference TEXT DEFAULT '',
  languages TEXT[] DEFAULT '{}',
  bonus_skills TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sitter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sitter profiles are viewable by authenticated users"
  ON public.sitter_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own sitter profile"
  ON public.sitter_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sitter profile"
  ON public.sitter_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_sitter_profiles_updated_at
  BEFORE UPDATE ON public.sitter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Past animals table for repeatable animal entries
CREATE TABLE public.past_animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitter_profile_id UUID NOT NULL REFERENCES public.sitter_profiles(id) ON DELETE CASCADE,
  species TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.past_animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Past animals are viewable by authenticated users"
  ON public.past_animals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own past animals"
  ON public.past_animals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sitter_profiles WHERE id = sitter_profile_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own past animals"
  ON public.past_animals FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sitter_profiles WHERE id = sitter_profile_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own past animals"
  ON public.past_animals FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sitter_profiles WHERE id = sitter_profile_id AND user_id = auth.uid()
  ));

-- Storage bucket for avatars and animal photos
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
