
CREATE TABLE public.emergency_sitter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  radius_km integer NOT NULL DEFAULT 20,
  animal_types text[] NOT NULL DEFAULT '{}',
  weekly_availability jsonb DEFAULT '{}',
  sms_alerts boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.emergency_sitter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all emergency profiles"
  ON public.emergency_sitter_profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can manage own emergency profile"
  ON public.emergency_sitter_profiles FOR ALL
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all emergency profiles"
  ON public.emergency_sitter_profiles FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
