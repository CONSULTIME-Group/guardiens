CREATE POLICY "Admins can view all verification logs"
ON public.identity_verification_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));