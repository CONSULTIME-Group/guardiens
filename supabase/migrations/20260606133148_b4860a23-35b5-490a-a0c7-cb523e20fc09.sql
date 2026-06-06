-- RLS storage.objects pour bucket pro-documents
CREATE POLICY "Owners can upload to own folder pro-documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pro-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owners can read own pro-documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pro-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Owners can delete own pending pro-documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pro-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can update pro-documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pro-documents'
    AND public.has_role(auth.uid(), 'admin')
  );