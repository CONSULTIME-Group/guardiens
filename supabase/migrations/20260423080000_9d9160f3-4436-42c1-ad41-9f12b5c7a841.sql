ALTER TABLE public.admin_message_logs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE OR REPLACE FUNCTION public.admin_message_logs_validate_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('success', 'failed') THEN
    RAISE EXCEPTION 'admin_message_logs.status doit être success ou failed (reçu: %)', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_message_logs_validate_status ON public.admin_message_logs;
CREATE TRIGGER trg_admin_message_logs_validate_status
BEFORE INSERT OR UPDATE ON public.admin_message_logs
FOR EACH ROW EXECUTE FUNCTION public.admin_message_logs_validate_status();

CREATE INDEX IF NOT EXISTS idx_admin_message_logs_status ON public.admin_message_logs(status, sent_at DESC);

CREATE OR REPLACE FUNCTION public.admin_log_message_failure(
  p_target_user_id uuid,
  p_content text,
  p_error_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_log_id uuid;
  v_recipient_email text;
  v_recipient_name text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  SELECT p.email, NULLIF(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), '')
    INTO v_recipient_email, v_recipient_name
  FROM public.profiles p
  WHERE p.id = p_target_user_id;

  INSERT INTO public.admin_message_logs (
    admin_id, recipient_id, recipient_email, recipient_name,
    conversation_id, message_id, content, status, error_message
  ) VALUES (
    v_admin, p_target_user_id, v_recipient_email, v_recipient_name,
    NULL, NULL, coalesce(p_content, ''), 'failed', left(coalesce(p_error_message, 'Erreur inconnue'), 2000)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;