ALTER TABLE public.account_deletion_requests
  ALTER COLUMN scheduled_deletion_at SET DEFAULT (now() + interval '7 days');