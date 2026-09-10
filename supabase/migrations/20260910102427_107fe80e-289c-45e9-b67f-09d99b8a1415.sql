ALTER TABLE public.animal_associations
  ADD COLUMN IF NOT EXISTS consent_email_sent_to text,
  ADD COLUMN IF NOT EXISTS consent_email_resend_id text;