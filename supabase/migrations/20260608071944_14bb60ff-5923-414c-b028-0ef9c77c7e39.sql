GRANT SELECT ON public.breed_profiles TO anon, authenticated;
GRANT ALL ON public.breed_profiles TO service_role;
DROP POLICY IF EXISTS "Anyone can read breed profiles" ON public.breed_profiles;
CREATE POLICY "Public can read breed profiles"
  ON public.breed_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);