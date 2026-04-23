CREATE OR REPLACE FUNCTION public.admin_message_logs_validate_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.status NOT IN ('success', 'failed') THEN
    RAISE EXCEPTION 'admin_message_logs.status doit être success ou failed (reçu: %)', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;