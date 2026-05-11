
-- 1) Allow trusted server functions to bypass the sensitive-fields guard
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF current_user = 'service_role'
     OR current_setting('app.allow_internal_profile_update', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
       OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
       OR NEW.account_status IS DISTINCT FROM OLD.account_status
       OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
       OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
       OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
       OR NEW.email IS DISTINCT FROM OLD.email
    THEN
      RAISE EXCEPTION 'Modification de champs sensibles interdite';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) RPC to safely change a user's role (with whitelist for self-service)
CREATE OR REPLACE FUNCTION public.change_user_role(
  p_user_id uuid,
  p_new_role public.user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_old_role public.user_role;
  v_is_admin boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT role INTO v_old_role FROM public.profiles WHERE id = p_user_id;
  IF v_old_role IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  v_is_admin := public.has_role(v_caller, 'admin'::app_role);

  IF v_caller <> p_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  -- Self-service: only safe upgrades or no-op
  IF v_caller = p_user_id AND NOT v_is_admin THEN
    IF NOT (
      (v_old_role = 'owner'  AND p_new_role = 'both')
      OR (v_old_role = 'sitter' AND p_new_role = 'both')
      OR (v_old_role = p_new_role)
    ) THEN
      RAISE EXCEPTION 'Transition de rôle non autorisée (% -> %)', v_old_role, p_new_role;
    END IF;
  END IF;

  -- Allow the trigger to pass for this transaction only
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);

  UPDATE public.profiles SET role = p_new_role WHERE id = p_user_id;

  -- Ensure matching sub-profiles exist
  IF p_new_role IN ('sitter', 'both') THEN
    INSERT INTO public.sitter_profiles (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF p_new_role IN ('owner', 'both') THEN
    INSERT INTO public.owner_profiles (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_user_role(uuid, public.user_role) TO authenticated;
