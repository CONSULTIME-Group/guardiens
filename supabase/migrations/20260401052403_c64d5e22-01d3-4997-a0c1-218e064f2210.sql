
ALTER TABLE public.sits
ADD COLUMN IF NOT EXISTS min_gardien_sits integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.validate_min_gardien_sits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.min_gardien_sits < 0 THEN
    RAISE EXCEPTION 'min_gardien_sits must be >= 0';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

DROP TRIGGER IF EXISTS check_min_gardien_sits ON public.sits;
CREATE TRIGGER check_min_gardien_sits
BEFORE INSERT OR UPDATE OF min_gardien_sits ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.validate_min_gardien_sits();
