
DROP FUNCTION IF EXISTS public.create_alert_preference(text,text,text,text,integer,text,text,text[],text,text);

CREATE OR REPLACE FUNCTION public.create_alert_preference(
  p_label text,
  p_zone_type text,
  p_city text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_radius_km integer DEFAULT NULL,
  p_departement text DEFAULT NULL,
  p_region_code text DEFAULT NULL,
  p_alert_types text[] DEFAULT '{gardes,missions}',
  p_heure_envoi text DEFAULT '08:00',
  p_frequence text DEFAULT 'quotidien'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_id uuid;
BEGIN
  SELECT count(*) INTO v_count
  FROM alert_preferences
  WHERE user_id = auth.uid() AND active = true;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 zones actives atteint';
  END IF;

  INSERT INTO alert_preferences (
    user_id, label, zone_type, city, postal_code,
    radius_km, departement, region_code,
    alert_types, heure_envoi, frequence, active
  ) VALUES (
    auth.uid(), p_label, p_zone_type, p_city, p_postal_code,
    p_radius_km, p_departement, p_region_code,
    p_alert_types, p_heure_envoi, p_frequence, true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
