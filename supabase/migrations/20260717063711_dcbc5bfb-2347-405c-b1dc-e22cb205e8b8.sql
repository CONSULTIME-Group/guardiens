CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Escape hatch pour les RPC internes (ex: change_user_role) qui valident
  -- elles-mêmes les transitions autorisées avant de poser le flag.
  IF current_setting('app.allow_internal_profile_update', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
     OR NEW.identity_verification_status IS DISTINCT FROM OLD.identity_verification_status
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
     OR NEW.pro_status IS DISTINCT FROM OLD.pro_status
     OR NEW.pro_approved_at IS DISTINCT FROM OLD.pro_approved_at
     OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by
     OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
     OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
     OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
     OR NEW.free_months_credit IS DISTINCT FROM OLD.free_months_credit
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
     OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
     OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
  THEN
    RAISE EXCEPTION 'Modification interdite d''un champ sensible du profil';
  END IF;
  RETURN NEW;
END;
$function$;