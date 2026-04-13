-- 1. Allow admins to update sitter_profiles (to remove rejected competences)
CREATE POLICY "Admins can update sitter profiles"
  ON public.sitter_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Allow admins to update owner_profiles (to remove rejected competences)
CREATE POLICY "Admins can update owner profiles"
  ON public.owner_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Preserve verified experiences on user deletion
-- Change CASCADE to SET NULL so verified experiences survive account deletion
ALTER TABLE public.external_experiences
  DROP CONSTRAINT external_experiences_user_id_fkey,
  ADD CONSTRAINT external_experiences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Make user_id nullable to support orphaned experiences
ALTER TABLE public.external_experiences
  ALTER COLUMN user_id DROP NOT NULL;