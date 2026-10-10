-- Règle unique et testable du seuil de candidature (40 % inclus).
CREATE OR REPLACE FUNCTION public.application_completion_allowed(p_completion integer)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT coalesce(p_completion, 0) >= 40
$$;
GRANT EXECUTE ON FUNCTION public.application_completion_allowed(integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_application_min_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_completion integer;
BEGIN
  SELECT profile_completion INTO v_completion FROM public.profiles WHERE id = NEW.sitter_id;
  IF NOT public.application_completion_allowed(v_completion) THEN
    RAISE EXCEPTION 'PROFILE_INCOMPLETE: complétez votre profil (40 %% minimum) pour candidater'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_application_min_completion() FROM PUBLIC, anon, authenticated;