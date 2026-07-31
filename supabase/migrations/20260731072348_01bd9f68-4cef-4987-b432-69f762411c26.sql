ALTER TABLE public.email_preferences ALTER COLUMN nearby_daily_radius_km SET DEFAULT 100;

CREATE OR REPLACE FUNCTION public.upsert_my_email_preferences(
  p_product boolean,
  p_digest boolean,
  p_alert boolean,
  p_new_mission_digest boolean DEFAULT NULL::boolean,
  p_nearby_daily_digest boolean DEFAULT NULL::boolean,
  p_nearby_daily_radius_km integer DEFAULT NULL::integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF p_nearby_daily_radius_km IS NOT NULL
     AND p_nearby_daily_radius_km NOT IN (5, 15, 30, 50, 100) THEN
    RAISE EXCEPTION 'Rayon invalide (attendu 5, 15, 30, 50 ou 100)';
  END IF;

  INSERT INTO public.email_preferences (
    user_id, product_emails, digest_emails, alert_emails,
    new_mission_digest, nearby_daily_digest, nearby_daily_radius_km
  )
  VALUES (
    auth.uid(),
    COALESCE(p_product, true),
    COALESCE(p_digest, true),
    COALESCE(p_alert, true),
    COALESCE(p_new_mission_digest, true),
    COALESCE(p_nearby_daily_digest, true),
    COALESCE(p_nearby_daily_radius_km, 100)
  )
  ON CONFLICT (user_id) DO UPDATE
    SET product_emails = EXCLUDED.product_emails,
        digest_emails = EXCLUDED.digest_emails,
        alert_emails = EXCLUDED.alert_emails,
        new_mission_digest = COALESCE(EXCLUDED.new_mission_digest, public.email_preferences.new_mission_digest),
        nearby_daily_digest = COALESCE(EXCLUDED.nearby_daily_digest, public.email_preferences.nearby_daily_digest),
        nearby_daily_radius_km = COALESCE(EXCLUDED.nearby_daily_radius_km, public.email_preferences.nearby_daily_radius_km),
        updated_at = now();
END;
$function$;