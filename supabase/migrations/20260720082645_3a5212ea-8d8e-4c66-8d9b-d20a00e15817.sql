
CREATE OR REPLACE FUNCTION public.enforce_mutual_aid_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_status text;
BEGIN
  IF TG_TABLE_NAME = 'small_missions' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'small_mission_responses' THEN
    v_user_id := NEW.responder_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(v_user_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(account_status, 'active')
    INTO v_status
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'account_not_active'
      USING ERRCODE = 'P0001', HINT = 'account_not_active';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_community_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_status text;
BEGIN
  v_user_id := NEW.author_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(v_user_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(account_status, 'active')
    INTO v_status
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'account_not_active'
      USING ERRCODE = 'P0001', HINT = 'account_not_active';
  END IF;

  RETURN NEW;
END;
$function$;
