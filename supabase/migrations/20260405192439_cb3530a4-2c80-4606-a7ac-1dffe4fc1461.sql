
ALTER TABLE public.sits
ADD COLUMN IF NOT EXISTS reminder_j7_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_j48_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS review_j1_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS review_j5_sent boolean DEFAULT false;
