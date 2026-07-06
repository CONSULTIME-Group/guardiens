ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alma_first_meeting_seen boolean NOT NULL DEFAULT false;