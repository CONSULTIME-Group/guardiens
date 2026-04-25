CREATE POLICY "Admins can view all applications"
ON public.applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));