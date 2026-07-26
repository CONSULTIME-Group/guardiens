-- 1) Reprise: profiles.email_preferences (JSONB) -> table email_preferences, refus le plus restrictif
INSERT INTO public.email_preferences (user_id, product_emails, digest_emails, alert_emails, new_mission_digest, nearby_daily_digest)
SELECT p.id,
       COALESCE((p.email_preferences->>'relance_avis')::boolean, true),
       COALESCE((p.email_preferences->>'alertes_digest')::boolean, true),
       COALESCE((p.email_preferences->>'nouvelles_annonces')::boolean, true),
       COALESCE((p.email_preferences->>'petites_missions')::boolean, true),
       COALESCE((p.email_preferences->>'autour_de_vous')::boolean, true)
FROM public.profiles p
WHERE p.email_preferences IS NOT NULL
  AND jsonb_typeof(p.email_preferences) = 'object'
ON CONFLICT (user_id) DO UPDATE SET
  product_emails      = public.email_preferences.product_emails AND EXCLUDED.product_emails,
  digest_emails       = public.email_preferences.digest_emails AND EXCLUDED.digest_emails,
  alert_emails        = public.email_preferences.alert_emails AND EXCLUDED.alert_emails,
  new_mission_digest  = public.email_preferences.new_mission_digest AND EXCLUDED.new_mission_digest,
  nearby_daily_digest = public.email_preferences.nearby_daily_digest AND EXCLUDED.nearby_daily_digest,
  updated_at          = now();

-- 2) Lecture serveur: regle du plus restrictif entre la table et l'ancien JSONB
CREATE OR REPLACE FUNCTION public.get_email_preferences_by_email(p_email text)
RETURNS TABLE(user_id uuid, product_emails boolean, digest_emails boolean, alert_emails boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id,
         COALESCE(ep.product_emails, true)
           AND COALESCE((p.email_preferences->>'relance_avis')::boolean, true),
         COALESCE(ep.digest_emails, true)
           AND COALESCE((p.email_preferences->>'alertes_digest')::boolean, true),
         COALESCE(ep.alert_emails, true)
           AND COALESCE((p.email_preferences->>'nouvelles_annonces')::boolean, true)
  FROM public.profiles p
  LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
  WHERE lower(p.email) = lower(p_email)
  LIMIT 1;
$function$;

-- 3) Ecriture partielle depuis n'importe quel ecran de reglages (source de verite unique)
CREATE OR REPLACE FUNCTION public.patch_my_email_preferences(
  p_product_emails boolean DEFAULT NULL,
  p_digest_emails boolean DEFAULT NULL,
  p_alert_emails boolean DEFAULT NULL,
  p_new_sit_digest boolean DEFAULT NULL,
  p_new_mission_digest boolean DEFAULT NULL,
  p_nearby_daily_digest boolean DEFAULT NULL,
  p_nearby_daily_radius_km integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.email_preferences (user_id) VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.email_preferences SET
    product_emails         = COALESCE(p_product_emails, product_emails),
    digest_emails          = COALESCE(p_digest_emails, digest_emails),
    alert_emails           = COALESCE(p_alert_emails, alert_emails),
    new_sit_digest         = COALESCE(p_new_sit_digest, new_sit_digest),
    new_mission_digest     = COALESCE(p_new_mission_digest, new_mission_digest),
    nearby_daily_digest    = COALESCE(p_nearby_daily_digest, nearby_daily_digest),
    nearby_daily_radius_km = COALESCE(p_nearby_daily_radius_km, nearby_daily_radius_km),
    updated_at             = now()
  WHERE user_id = v_uid;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.patch_my_email_preferences(boolean, boolean, boolean, boolean, boolean, boolean, integer) TO authenticated;