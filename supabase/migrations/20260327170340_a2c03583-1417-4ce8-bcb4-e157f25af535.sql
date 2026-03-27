-- Allow admins to manage identity verification status on profiles
CREATE POLICY "Admins can update profile verification state"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to write verification log entries
CREATE POLICY "Admins can insert verification logs"
ON public.identity_verification_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() IS NOT NULL);

-- Allow admins to view private identity documents in storage
CREATE POLICY "Admins can view all identity docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete identity documents during revocation flows
CREATE POLICY "Admins can delete identity docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND public.has_role(auth.uid(), 'admin')
);