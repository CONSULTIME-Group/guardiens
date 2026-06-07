CREATE OR REPLACE FUNCTION public.enforce_error_log_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_email text;
  jwt_uid uuid;
BEGIN
  jwt_uid := auth.uid();
  IF jwt_uid IS NULL THEN
    NEW.user_id := NULL;
    NEW.user_email := NULL;
    RETURN NEW;
  END IF;
  NEW.user_id := jwt_uid;
  SELECT email INTO jwt_email FROM auth.users WHERE id = jwt_uid;
  NEW.user_email := jwt_email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_error_log_user_email ON public.error_logs;
CREATE TRIGGER trg_enforce_error_log_user_email
BEFORE INSERT ON public.error_logs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_error_log_user_email();

DROP POLICY IF EXISTS garde_accords_no_direct_insert ON public.garde_accords;