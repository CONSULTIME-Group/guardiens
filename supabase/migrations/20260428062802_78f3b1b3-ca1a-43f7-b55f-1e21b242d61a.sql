-- Create public storage bucket for email assets (banners, logos used in emails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy so email clients can load the banner image
CREATE POLICY "Public can read email assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'email-assets');