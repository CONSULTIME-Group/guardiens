DROP POLICY IF EXISTS "Users can view all owner gallery photos" ON public.owner_gallery;

CREATE POLICY "Owner gallery photos are publicly readable"
ON public.owner_gallery
FOR SELECT
TO anon, authenticated
USING (true);