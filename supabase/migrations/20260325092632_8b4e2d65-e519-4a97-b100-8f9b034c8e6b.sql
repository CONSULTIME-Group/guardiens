
CREATE TABLE public.house_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exact_address TEXT DEFAULT '',
  access_codes TEXT DEFAULT '',
  wifi_name TEXT DEFAULT '',
  wifi_password TEXT DEFAULT '',
  vet_name TEXT DEFAULT '',
  vet_phone TEXT DEFAULT '',
  vet_address TEXT DEFAULT '',
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  neighbor_name TEXT DEFAULT '',
  neighbor_phone TEXT DEFAULT '',
  plumber_phone TEXT DEFAULT '',
  electrician_phone TEXT DEFAULT '',
  detailed_instructions TEXT DEFAULT '',
  trash_days TEXT DEFAULT '',
  heating_instructions TEXT DEFAULT '',
  appliance_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

ALTER TABLE public.house_guides ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD their own guide
CREATE POLICY "Owners can manage their house guide"
  ON public.house_guides FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sitters with confirmed sits can view the guide
CREATE POLICY "Confirmed sitters can view house guide"
  ON public.house_guides FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sits s
    JOIN public.applications a ON a.sit_id = s.id
    WHERE s.property_id = house_guides.property_id
    AND s.status = 'confirmed'
    AND a.sitter_id = auth.uid()
    AND a.status = 'accepted'
  ));
