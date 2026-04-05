-- Create the storage bucket for mission photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('mission-photos', 'mission-photos', true);

-- Public read access
CREATE POLICY "Mission photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'mission-photos');

-- Authenticated users can upload
CREATE POLICY "Users can upload mission photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mission-photos');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own mission photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mission-photos' AND auth.uid()::text = (storage.foldername(name))[1]);