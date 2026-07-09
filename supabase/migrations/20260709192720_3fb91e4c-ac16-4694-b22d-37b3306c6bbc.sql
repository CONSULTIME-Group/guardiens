
ALTER TABLE public.email_preferences
  ADD COLUMN IF NOT EXISTS nearby_daily_digest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nearby_daily_radius_km integer NOT NULL DEFAULT 15;

ALTER TABLE public.email_preferences
  DROP CONSTRAINT IF EXISTS email_preferences_nearby_radius_check;
ALTER TABLE public.email_preferences
  ADD CONSTRAINT email_preferences_nearby_radius_check
  CHECK (nearby_daily_radius_km IN (5, 15, 30));

CREATE OR REPLACE FUNCTION public.upsert_my_email_preferences(
  p_product boolean,
  p_digest boolean,
  p_alert boolean,
  p_new_mission_digest boolean DEFAULT NULL,
  p_nearby_daily_digest boolean DEFAULT NULL,
  p_nearby_daily_radius_km integer DEFAULT NULL
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
     AND p_nearby_daily_radius_km NOT IN (5, 15, 30) THEN
    RAISE EXCEPTION 'Rayon invalide (attendu 5, 15 ou 30)';
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
    COALESCE(p_nearby_daily_radius_km, 15)
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

-- Schedule the new digest every day at 11:00 UTC (13:00 Europe/Paris in summer, 12:00 in winter).
SELECT cron.unschedule('nearby-daily-digest')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nearby-daily-digest');

SELECT cron.schedule(
  'nearby-daily-digest',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-nearby-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
