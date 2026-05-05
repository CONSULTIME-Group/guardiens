
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS cover_photo_url text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cover_photo_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_sit_email_sent_at timestamptz;
