ALTER TABLE public.email_preferences
  ADD COLUMN IF NOT EXISTS sit_alert_frequency text NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS mutual_aid_frequency text NOT NULL DEFAULT 'weekly';

ALTER TABLE public.email_preferences
  DROP CONSTRAINT IF EXISTS email_preferences_sit_alert_frequency_check;
ALTER TABLE public.email_preferences
  ADD CONSTRAINT email_preferences_sit_alert_frequency_check
  CHECK (sit_alert_frequency IN ('immediate', 'weekly', 'none'));

ALTER TABLE public.email_preferences
  DROP CONSTRAINT IF EXISTS email_preferences_mutual_aid_frequency_check;
ALTER TABLE public.email_preferences
  ADD CONSTRAINT email_preferences_mutual_aid_frequency_check
  CHECK (mutual_aid_frequency IN ('weekly', 'none'));

-- Reprise des reglages existants, sans jamais rallumer un flux coupe.
UPDATE public.email_preferences
SET sit_alert_frequency = CASE WHEN alert_emails IS FALSE THEN 'none' ELSE 'immediate' END,
    mutual_aid_frequency = CASE
      WHEN new_mission_digest IS FALSE OR digest_emails IS FALSE THEN 'none'
      ELSE 'weekly'
    END;

CREATE OR REPLACE FUNCTION public.upsert_my_email_preferences(
  p_product boolean,
  p_digest boolean,
  p_alert boolean,
  p_new_mission_digest boolean DEFAULT NULL,
  p_nearby_daily_digest boolean DEFAULT NULL,
  p_nearby_daily_radius_km integer DEFAULT NULL,
  p_sit_alert_frequency text DEFAULT NULL,
  p_mutual_aid_frequency text DEFAULT NULL
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
  IF p_sit_alert_frequency IS NOT NULL
     AND p_sit_alert_frequency NOT IN ('immediate', 'weekly', 'none') THEN
    RAISE EXCEPTION 'Frequence annonces invalide';
  END IF;
  IF p_mutual_aid_frequency IS NOT NULL
     AND p_mutual_aid_frequency NOT IN ('weekly', 'none') THEN
    RAISE EXCEPTION 'Frequence entraide invalide';
  END IF;

  INSERT INTO public.email_preferences (
    user_id, product_emails, digest_emails, alert_emails,
    new_mission_digest, nearby_daily_digest, nearby_daily_radius_km,
    sit_alert_frequency, mutual_aid_frequency
  )
  VALUES (
    auth.uid(),
    COALESCE(p_product, true),
    COALESCE(p_digest, true),
    COALESCE(p_alert, true),
    COALESCE(p_new_mission_digest, true),
    COALESCE(p_nearby_daily_digest, true),
    COALESCE(p_nearby_daily_radius_km, 30),
    COALESCE(p_sit_alert_frequency, 'immediate'),
    COALESCE(p_mutual_aid_frequency, 'weekly')
  )
  ON CONFLICT (user_id) DO UPDATE
    SET product_emails = EXCLUDED.product_emails,
        digest_emails = EXCLUDED.digest_emails,
        alert_emails = EXCLUDED.alert_emails,
        new_mission_digest = COALESCE(EXCLUDED.new_mission_digest, public.email_preferences.new_mission_digest),
        nearby_daily_digest = COALESCE(EXCLUDED.nearby_daily_digest, public.email_preferences.nearby_daily_digest),
        nearby_daily_radius_km = COALESCE(EXCLUDED.nearby_daily_radius_km, public.email_preferences.nearby_daily_radius_km),
        sit_alert_frequency = COALESCE(EXCLUDED.sit_alert_frequency, public.email_preferences.sit_alert_frequency),
        mutual_aid_frequency = COALESCE(EXCLUDED.mutual_aid_frequency, public.email_preferences.mutual_aid_frequency),
        updated_at = now();
END;
$function$;