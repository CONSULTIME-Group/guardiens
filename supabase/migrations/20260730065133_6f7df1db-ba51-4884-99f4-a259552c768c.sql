CREATE OR REPLACE FUNCTION public.trg_prevent_sensitive_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.allow_internal_profile_update', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
     -- identity_verification_status volontairement absent : la transition membre vers 'pending' est autorisée et contrôlée finement par prevent_profile_sensitive_self_update(). La dupliquer ici bloquait toute soumission de pièce d'identité.
     OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
     OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
     OR NEW.free_months_credit IS DISTINCT FROM OLD.free_months_credit
     OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
     OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
  THEN
    RAISE EXCEPTION 'Modification de champs sensibles interdite';
  END IF;
  RETURN NEW;
END;
$function$;