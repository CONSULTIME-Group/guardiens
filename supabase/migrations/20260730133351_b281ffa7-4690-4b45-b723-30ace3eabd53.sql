ALTER TABLE public.user_journeys
  ADD COLUMN IF NOT EXISTS transient_failure_count integer NOT NULL DEFAULT 0;