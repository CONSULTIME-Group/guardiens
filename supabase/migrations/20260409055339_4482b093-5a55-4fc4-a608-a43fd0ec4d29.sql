CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Allow service_role (edge functions using SUPABASE_SERVICE_ROLE_KEY)
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
       OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
       OR NEW.is_manual_super IS DISTINCT FROM OLD.is_manual_super
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