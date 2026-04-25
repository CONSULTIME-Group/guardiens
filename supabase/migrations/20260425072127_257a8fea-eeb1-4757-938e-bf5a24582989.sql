-- Ensure full row data on UPDATE/DELETE so the client receives the previous values
ALTER TABLE public.applications REPLICA IDENTITY FULL;
ALTER TABLE public.sits REPLICA IDENTITY FULL;

-- Add to the realtime publication (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'applications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sits;
  END IF;
END $$;