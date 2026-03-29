
-- Create skills_library table
CREATE TABLE IF NOT EXISTS public.skills_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  normalized_label TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  usage_count INTEGER DEFAULT 1 NOT NULL,
  merged_into UUID REFERENCES public.skills_library(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  first_submitted_by UUID REFERENCES public.profiles(id)
);

-- Create unique index on normalized_label
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_library_normalized ON public.skills_library (normalized_label);

-- Add custom_skills column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_skills JSONB DEFAULT '[]';

-- Enable RLS
ALTER TABLE public.skills_library ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone authenticated can read approved skills
CREATE POLICY "Anyone can read approved skills" ON public.skills_library
  FOR SELECT TO authenticated
  USING (status = 'approved' OR first_submitted_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS: Authenticated can insert
CREATE POLICY "Authenticated can insert skills" ON public.skills_library
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = first_submitted_by);

-- RLS: Admins can update
CREATE POLICY "Admins can update skills" ON public.skills_library
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Admins can delete
CREATE POLICY "Admins can delete skills" ON public.skills_library
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_skill_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid skill status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_skill_status
  BEFORE INSERT OR UPDATE ON public.skills_library
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_skill_status();
