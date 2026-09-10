CREATE POLICY "Association photos are readable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'association-photos');

CREATE POLICY "Admins insert association photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'association-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update association photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'association-photos' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'association-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete association photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'association-photos' AND public.has_role(auth.uid(), 'admin'::app_role));
