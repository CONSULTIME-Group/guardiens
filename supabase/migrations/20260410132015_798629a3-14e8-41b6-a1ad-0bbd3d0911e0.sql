INSERT INTO storage.buckets (id, name, public) VALUES ('badges', 'badges', true);

CREATE POLICY "Public read access for badges" ON storage.objects FOR SELECT TO public USING (bucket_id = 'badges');
CREATE POLICY "Admin upload badges" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'badges' AND public.has_role(auth.uid(), 'admin'));