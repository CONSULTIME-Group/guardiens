CREATE TABLE public.faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published FAQ entries are publicly readable"
  ON public.faq_entries FOR SELECT TO anon
  USING (published = true);

CREATE POLICY "Authenticated can read all FAQ entries"
  ON public.faq_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert FAQ entries"
  ON public.faq_entries FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update FAQ entries"
  ON public.faq_entries FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete FAQ entries"
  ON public.faq_entries FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_faq_entries_updated_at
  BEFORE UPDATE ON public.faq_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();