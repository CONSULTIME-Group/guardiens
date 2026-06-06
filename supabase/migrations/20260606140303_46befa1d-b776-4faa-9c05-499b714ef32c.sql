-- 1. Enum catégories pro
CREATE TYPE public.pro_category AS ENUM (
  'veterinaire',
  'pet_sitter_pro',
  'educateur',
  'toiletteur',
  'osteopathe',
  'dresseur_sportif',
  'transporteur',
  'photographe'
);

CREATE TYPE public.pro_moderation_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Table pro_profiles
CREATE TABLE public.pro_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  raison_sociale TEXT NOT NULL,
  siret TEXT,
  siret_verified BOOLEAN NOT NULL DEFAULT false,
  category public.pro_category NOT NULL,
  sub_categories TEXT[] NOT NULL DEFAULT '{}',
  logo_url TEXT,
  cover_url TEXT,
  description TEXT,
  diplomes TEXT[] NOT NULL DEFAULT '{}',
  ordre_number TEXT,
  city TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  zone_radius_km INTEGER DEFAULT 20,
  zone_cities TEXT[] NOT NULL DEFAULT '{}',
  phone TEXT,
  website TEXT,
  email_contact TEXT,
  social_links JSONB NOT NULL DEFAULT '{}',
  horaires JSONB NOT NULL DEFAULT '{}',
  urgences_24_7 BOOLEAN NOT NULL DEFAULT false,
  tarif_min INTEGER,
  tarif_max INTEGER,
  tarif_note TEXT,
  status public.pro_moderation_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

CREATE INDEX idx_pro_profiles_status ON public.pro_profiles (status);
CREATE INDEX idx_pro_profiles_category ON public.pro_profiles (category);
CREATE INDEX idx_pro_profiles_city ON public.pro_profiles (city);
CREATE INDEX idx_pro_profiles_user ON public.pro_profiles (user_id);

-- 3. GRANTS
GRANT SELECT ON public.pro_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_profiles TO authenticated;
GRANT ALL ON public.pro_profiles TO service_role;

-- 4. RLS
ALTER TABLE public.pro_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved pro profiles"
  ON public.pro_profiles FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Pros can view their own profile"
  ON public.pro_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all pro profiles"
  ON public.pro_profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Pros can create their own profile"
  ON public.pro_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pros can update their own profile"
  ON public.pro_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any pro profile"
  ON public.pro_profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Pros can delete their own profile"
  ON public.pro_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any pro profile"
  ON public.pro_profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Trigger updated_at
CREATE TRIGGER update_pro_profiles_updated_at
  BEFORE UPDATE ON public.pro_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Storage policies pour bucket pro-logos (privé, lecture publique)
CREATE POLICY "Public can view pro logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pro-logos');

CREATE POLICY "Pros can upload their own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pro-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Pros can update their own logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pro-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Pros can delete their own logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pro-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );