
-- Add equipments and photos to properties
ALTER TABLE public.properties ADD COLUMN equipments TEXT[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN photos TEXT[] DEFAULT '{}';

-- Owner profiles table for owner-specific preferences
CREATE TABLE public.owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Step 4: Expectations & rules
  preferred_sitter_types TEXT[] DEFAULT '{}',
  presence_expected TEXT DEFAULT '',
  experience_required BOOLEAN DEFAULT false,
  specific_expectations TEXT DEFAULT '',
  visits_allowed TEXT DEFAULT '',
  overnight_guest TEXT DEFAULT '',
  space_usage TEXT[] DEFAULT '{}',
  smoker_accepted TEXT DEFAULT '',
  rules_notes TEXT DEFAULT '',
  -- Step 5: Welcome & communication
  meeting_preference TEXT[] DEFAULT '{}',
  handover_preference TEXT DEFAULT '',
  welcome_notes TEXT DEFAULT '',
  news_frequency TEXT DEFAULT '',
  news_format TEXT[] DEFAULT '{}',
  preferred_time TEXT DEFAULT '',
  communication_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner profiles are viewable by authenticated users"
  ON public.owner_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own owner profile"
  ON public.owner_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own owner profile"
  ON public.owner_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_owner_profiles_updated_at
  BEFORE UPDATE ON public.owner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for property photos
INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', true);

CREATE POLICY "Property photos are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'property-photos');

CREATE POLICY "Users can upload property photos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update property photos"
  ON storage.objects FOR UPDATE USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete property photos"
  ON storage.objects FOR DELETE USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
