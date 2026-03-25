
-- Create a private storage bucket for identity documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can upload their own ID documents
CREATE POLICY "Users can upload their own identity docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can view their own ID documents
CREATE POLICY "Users can view their own identity docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can delete their own ID documents
CREATE POLICY "Users can delete their own identity docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add column to track verification status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_document_url text DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_verification_status text DEFAULT 'not_submitted';
