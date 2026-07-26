CREATE POLICY "Users can update their own identity docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = (auth.uid())::text)
WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = (auth.uid())::text);