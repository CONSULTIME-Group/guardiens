CREATE OR REPLACE FUNCTION public.looks_like_pricing(txt text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  t text;
BEGIN
  IF txt IS NULL OR length(trim(txt)) = 0 THEN
    RETURN false;
  END IF;
  t := lower(unaccent_immutable_safe(txt));

  IF t ~ '\d+([.,]\d+)?\s*(€|eur(os?)?\y)' THEN
    RETURN true;
  END IF;
  IF t ~ '(€|\yeur(os?)?\y)\s*\d+' THEN
    RETURN true;
  END IF;
  IF t ~ '(tarif|devis|facture|prestation payante|par jour|par nuit|par visite|par passage)' AND t ~ '\d' THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$function$;