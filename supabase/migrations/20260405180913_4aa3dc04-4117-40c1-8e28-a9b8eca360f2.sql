ALTER TABLE public.small_missions
ADD COLUMN photos text[] NOT NULL DEFAULT '{}'::text[];