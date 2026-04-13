CREATE POLICY "anon_select_verified_experiences"
ON public.external_experiences
FOR SELECT
TO anon
USING (verification_status = 'verified');
