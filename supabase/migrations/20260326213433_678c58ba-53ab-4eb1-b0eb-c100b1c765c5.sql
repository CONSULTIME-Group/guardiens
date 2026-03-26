
-- Create enum for gallery photo source
CREATE TYPE public.gallery_source AS ENUM ('guardiens', 'external');

-- Create enum for verification status
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Sitter gallery table
CREATE TABLE public.sitter_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  animal_type TEXT,
  animal_breed TEXT,
  city TEXT,
  photo_date DATE,
  source public.gallery_source NOT NULL DEFAULT 'external',
  sit_id UUID REFERENCES public.sits(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sitter_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all gallery photos"
  ON public.sitter_gallery FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own gallery photos"
  ON public.sitter_gallery FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gallery photos"
  ON public.sitter_gallery FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gallery photos"
  ON public.sitter_gallery FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- External experiences table
CREATE TABLE public.external_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL DEFAULT '',
  screenshot_urls TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL DEFAULT '',
  animal_types TEXT NOT NULL DEFAULT '',
  city TEXT,
  country TEXT,
  duration TEXT NOT NULL DEFAULT '',
  experience_date TEXT NOT NULL DEFAULT '',
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.external_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view verified or own experiences"
  ON public.external_experiences FOR SELECT
  TO authenticated
  USING (verification_status = 'verified' OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own experiences"
  ON public.external_experiences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending experiences"
  ON public.external_experiences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND verification_status = 'pending');

CREATE POLICY "Admins can update all experiences"
  ON public.external_experiences FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own experiences"
  ON public.external_experiences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete experiences"
  ON public.external_experiences FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for gallery photos
INSERT INTO storage.buckets (id, name, public) VALUES ('sitter-gallery', 'sitter-gallery', true);

-- Storage bucket for experience screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('experience-screenshots', 'experience-screenshots', false);

-- RLS for sitter-gallery bucket
CREATE POLICY "Anyone can view gallery photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sitter-gallery');

CREATE POLICY "Authenticated users can upload gallery photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sitter-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own gallery photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'sitter-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS for experience-screenshots bucket
CREATE POLICY "Owners and admins can view screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'experience-screenshots' AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Authenticated users can upload screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'experience-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'experience-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
