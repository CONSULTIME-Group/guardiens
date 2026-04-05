
-- Fix mission-photos INSERT policy to enforce user-scoped folder
DROP POLICY IF EXISTS "Users can upload mission photos" ON storage.objects;

CREATE POLICY "Users can upload mission photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mission-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
