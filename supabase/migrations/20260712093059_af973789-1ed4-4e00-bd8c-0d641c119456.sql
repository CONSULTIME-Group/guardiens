-- Restore public read access on sitter_profiles for anonymous visitors
CREATE POLICY "Public sitter profiles read"
  ON public.sitter_profiles
  AS PERMISSIVE FOR SELECT
  TO anon
  USING (true);

-- Grants for sitter_profiles (Data API)
GRANT SELECT ON public.sitter_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitter_profiles TO authenticated;
GRANT ALL ON public.sitter_profiles TO service_role;

-- Grants for small_missions (Data API) — anon has a public-read policy on open missions
GRANT SELECT ON public.small_missions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.small_missions TO authenticated;
GRANT ALL ON public.small_missions TO service_role;