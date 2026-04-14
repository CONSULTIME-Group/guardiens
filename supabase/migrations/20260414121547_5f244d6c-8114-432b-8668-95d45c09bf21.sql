ALTER TABLE public.sits
  ADD COLUMN IF NOT EXISTS max_applications integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accepting_applications boolean NOT NULL DEFAULT true;