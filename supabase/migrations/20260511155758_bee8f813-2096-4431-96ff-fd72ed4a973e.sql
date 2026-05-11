CREATE OR REPLACE FUNCTION public.ensure_subprofiles_on_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  IF NEW.role IN ('sitter', 'both') THEN
    INSERT INTO public.sitter_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF NEW.role IN ('owner', 'both') THEN
    INSERT INTO public.owner_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_subprofiles_on_role_change_trg ON public.profiles;
CREATE TRIGGER ensure_subprofiles_on_role_change_trg
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_subprofiles_on_role_change();