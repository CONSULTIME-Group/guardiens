CREATE OR REPLACE FUNCTION public.issue_application_action_token(
  p_application_id uuid,
  p_action text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_token text;
BEGIN
  IF p_action NOT IN ('decline','thinking') THEN
    RAISE EXCEPTION 'unsupported_action';
  END IF;

  SELECT token INTO v_token
  FROM public.application_action_tokens
  WHERE application_id = p_application_id
    AND action = p_action
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF v_token IS NOT NULL THEN
    RETURN v_token;
  END IF;

  DELETE FROM public.application_action_tokens
  WHERE application_id = p_application_id
    AND action = p_action
    AND used_at IS NULL
    AND expires_at <= now();

  INSERT INTO public.application_action_tokens (application_id, action, token)
  VALUES (
    p_application_id,
    p_action,
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  )
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$fn$;