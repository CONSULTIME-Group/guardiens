
-- ÉTAPE 1 — Colonne dénormalisée sur profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS completed_sits_count integer NOT NULL DEFAULT 0;

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_completed_sits_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_sits_count < 0 THEN
    RAISE EXCEPTION 'completed_sits_count must be >= 0';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

DROP TRIGGER IF EXISTS check_completed_sits_count ON public.profiles;
CREATE TRIGGER check_completed_sits_count
BEFORE INSERT OR UPDATE OF completed_sits_count ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_completed_sits_count();

-- ÉTAPE 2 — Fonction de recalcul (adapted: sits + applications)
CREATE OR REPLACE FUNCTION public.recalculate_completed_sits(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET completed_sits_count = (
    SELECT COUNT(*)
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE a.sitter_id = p_user_id
    AND a.status = 'accepted'
    AND s.status = 'completed'
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- ÉTAPE 3 — Trigger on sits (when status changes to/from completed)
CREATE OR REPLACE FUNCTION public.trigger_update_completed_sits_on_sit()
RETURNS TRIGGER AS $$
DECLARE
  v_sitter_id uuid;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR v_sitter_id IN
      SELECT a.sitter_id FROM public.applications a
      WHERE a.sit_id = NEW.id AND a.status = 'accepted'
    LOOP
      PERFORM public.recalculate_completed_sits(v_sitter_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS update_completed_sits_on_sit ON public.sits;
CREATE TRIGGER update_completed_sits_on_sit
AFTER UPDATE OF status ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_completed_sits_on_sit();

-- ÉTAPE 5 — Index pour performance
CREATE INDEX IF NOT EXISTS idx_profiles_completed_sits
ON public.profiles (completed_sits_count);
