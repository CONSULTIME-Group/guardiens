-- Anon SELECT on sitter_profiles
CREATE POLICY "sitter_profiles_public_read"
ON public.sitter_profiles FOR SELECT
TO anon
USING (true);

-- Anon SELECT on sitter_gallery
CREATE POLICY "sitter_gallery_public_read"
ON public.sitter_gallery FOR SELECT
TO anon
USING (true);