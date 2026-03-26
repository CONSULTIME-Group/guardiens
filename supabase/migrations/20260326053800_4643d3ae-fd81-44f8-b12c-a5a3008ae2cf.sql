
CREATE TABLE public.seo_department_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department text NOT NULL,
  slug text NOT NULL UNIQUE,
  region text NOT NULL DEFAULT 'Auvergne-Rhône-Alpes',
  h1_title text NOT NULL DEFAULT '',
  intro_text text NOT NULL DEFAULT '',
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  highlights text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  sitter_count integer NOT NULL DEFAULT 0,
  active_sits_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_department_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published department pages are publicly readable" ON public.seo_department_pages FOR SELECT TO anon USING (published = true);
CREATE POLICY "Authenticated can read all department pages" ON public.seo_department_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert department pages" ON public.seo_department_pages FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update department pages" ON public.seo_department_pages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete department pages" ON public.seo_department_pages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
