-- Lot ADM7 (18/10/2026, audit de l'admin, pilotage et pannes) : la file
-- « Technique » ne montre plus des comportements voulus.
-- 1. email_destroyed : un email marketing ou un résumé reporté par le plafond
--    de fréquence puis périmé est le plafond qui fonctionne. Le signal naît
--    fermé. Une alerte de nouvelle annonce perdue (cancel_reason
--    ttl_exceeded_nearby_sit_alert) reste ouverte : un gardien a manqué une garde.
-- 2. listing_proximity_large_broadcast : une diffusion à 5 000 km et plus est
--    une annonce internationale envoyée à tous les gardiens volontaires,
--    comportement voulu. Le signal naît fermé.
-- 3. Les signaux déjà ouverts qui répondent à ces règles sont fermés.
-- Hors périmètre (décisions de Jérémie en attente) : alertes de contenu du
-- 14/09, fermeture des signaux d'animation.
-- Rejouable.
CREATE OR REPLACE FUNCTION public.admin_signal_is_expected_noise(p_type text, p_metadata jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_type = 'email_destroyed' THEN
      coalesce(p_metadata->>'defer_reason', '') LIKE 'frequency\_cap%'
      AND coalesce(p_metadata->>'cancel_reason', '') <> 'ttl_exceeded_nearby_sit_alert'
    WHEN p_type = 'listing_proximity_large_broadcast' THEN
      jsonb_typeof(p_metadata->'radius_km') = 'number'
      AND (p_metadata->>'radius_km')::numeric >= 5000
    ELSE false
  END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_signals_close_expected_noise()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.resolved_at IS NULL AND public.admin_signal_is_expected_noise(NEW.signal_type, NEW.metadata) THEN
    NEW.resolved_at := now();
    NEW.action_taken := 'auto_resolved_expected_behaviour';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS admin_signals_close_expected_noise ON public.admin_signals;
CREATE TRIGGER admin_signals_close_expected_noise
  BEFORE INSERT OR UPDATE ON public.admin_signals
  FOR EACH ROW EXECUTE FUNCTION public.admin_signals_close_expected_noise();

REVOKE ALL ON FUNCTION public.admin_signals_close_expected_noise() FROM PUBLIC, anon, authenticated;

UPDATE public.admin_signals
   SET resolved_at = now(), action_taken = 'auto_resolved_expected_behaviour'
 WHERE resolved_at IS NULL
   AND public.admin_signal_is_expected_noise(signal_type, metadata);
