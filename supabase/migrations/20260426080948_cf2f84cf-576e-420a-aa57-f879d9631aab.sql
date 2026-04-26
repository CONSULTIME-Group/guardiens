ALTER TABLE public.sits
  ADD COLUMN IF NOT EXISTS owner_message text,
  ADD COLUMN IF NOT EXISTS daily_routine text;