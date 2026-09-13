CREATE TABLE public.volunteer_availability (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available boolean NOT NULL DEFAULT false,
  structure_types text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  departments text[] NOT NULL DEFAULT '{}',
  frequency text,
  current_association text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_availability TO authenticated;
GRANT ALL ON public.volunteer_availability TO service_role;

ALTER TABLE public.volunteer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chacun gere sa propre declaration de benevolat"
ON public.volunteer_availability
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les admins lisent toutes les declarations de benevolat"
ON public.volunteer_availability
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_volunteer_availability_updated_at
BEFORE UPDATE ON public.volunteer_availability
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();