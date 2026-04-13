-- Allow anonymous users to read active profiles (for public profile pages)
CREATE POLICY "profiles_anon_select_active"
ON public.profiles
FOR SELECT
TO anon
USING (account_status = 'active' AND onboarding_completed = true);
