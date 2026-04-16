-- Fix the trigger to cast text to user_role enum
CREATE OR REPLACE FUNCTION public.apply_role_from_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    _role := NEW.raw_user_meta_data ->> 'role';
    IF _role IS NOT NULL AND _role IN ('owner', 'sitter', 'both') THEN
      UPDATE public.profiles SET role = _role::public.user_role WHERE id = NEW.id;

      IF _role IN ('sitter', 'both') THEN
        INSERT INTO public.sitter_profiles (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
      END IF;

      IF _role IN ('owner', 'both') THEN
        INSERT INTO public.owner_profiles (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;