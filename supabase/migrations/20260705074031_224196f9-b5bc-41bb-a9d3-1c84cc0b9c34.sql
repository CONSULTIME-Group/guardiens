-- Add updated_at column to sits table with auto-maintain trigger
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill from created_at for existing rows
UPDATE public.sits SET updated_at = created_at WHERE updated_at = now() OR updated_at IS NULL;

-- Reuse standard trigger function (assumed present in public schema)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_sits_updated_at ON public.sits;
CREATE TRIGGER update_sits_updated_at
  BEFORE UPDATE ON public.sits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();