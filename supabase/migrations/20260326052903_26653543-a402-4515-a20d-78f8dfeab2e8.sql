-- Place category enum
CREATE TYPE public.guide_place_category AS ENUM (
  'dog_park', 'walk_trail', 'vet', 'dog_friendly_cafe', 
  'dog_friendly_restaurant', 'pet_shop', 'water_point', 'general_park'
);

-- City guides table
CREATE TABLE public.city_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  postal_code text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  intro text NOT NULL DEFAULT '',
  ideal_for text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  generated_at timestamptz NOT NULL DEFAULT now(),
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.city_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published guides are publicly readable"
  ON public.city_guides FOR SELECT TO anon USING (published = true);

CREATE POLICY "Authenticated can read all guides"
  ON public.city_guides FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert guides"
  ON public.city_guides FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update guides"
  ON public.city_guides FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete guides"
  ON public.city_guides FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_city_guides_updated_at
  BEFORE UPDATE ON public.city_guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- City guide places table
CREATE TABLE public.city_guide_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_guide_id uuid NOT NULL REFERENCES public.city_guides(id) ON DELETE CASCADE,
  category public.guide_place_category NOT NULL,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  latitude numeric,
  longitude numeric,
  google_rating numeric,
  google_place_id text,
  description text NOT NULL DEFAULT '',
  dogs_welcome boolean NOT NULL DEFAULT true,
  leash_required boolean,
  photo_url text,
  tips text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.city_guide_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Places are publicly readable"
  ON public.city_guide_places FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can read all places"
  ON public.city_guide_places FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert places"
  ON public.city_guide_places FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update places"
  ON public.city_guide_places FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete places"
  ON public.city_guide_places FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));