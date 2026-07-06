DO $$ BEGIN
  CREATE TYPE public.alma_frequency AS ENUM ('silent', 'balanced', 'talkative');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alma_frequency public.alma_frequency NOT NULL DEFAULT 'balanced';