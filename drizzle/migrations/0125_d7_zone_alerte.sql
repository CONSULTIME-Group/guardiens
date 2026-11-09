-- Lot D7 (09/11/2026, audit « Tableaux de bord ordinateur », état G3, « ok go je
-- valide fais tout ça » de Jérémie) : un gardien dont la garde ouverte la plus
-- proche est au-delà de 50 km choisit une zone d'alerte plus large depuis son
-- accueil. Cette fonction dit, pour chaque zone proposée, combien de gardes
-- ouvertes elle compte aujourd'hui, et quelles zones de gardes il suit déjà.
--
-- Zones proposées : rayon de 100 km (ALLOWED_ALERT_RADII s'arrête à 100), son
-- département, la France. Les zones « région » ne sont pas proposées : le
-- récapitulatif d'alerte ne les sert aujourd'hui que pour Auvergne-Rhône-Alpes.
-- Comptes alignés sur send-alert-digest : annonce publiée, pas la sienne, date
-- de fin à venir, candidatures ouvertes, en France (pays vide ou FR).
--
-- Lecture seule, membre connecté seulement, rejouable.
CREATE OR REPLACE FUNCTION public.get_alert_zone_options()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_lat double precision;
  v_lng double precision;
  v_city text;
  v_postal text;
  v_dept text;
  v_dept_name text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.latitude, p.longitude, nullif(btrim(p.city), ''), p.postal_code, p.departement_code
    INTO v_lat, v_lng, v_city, v_postal, v_dept
    FROM public.profiles p WHERE p.id = v_uid;

  SELECT d.nom INTO v_dept_name FROM public.departements d WHERE d.code = v_dept;

  RETURN jsonb_build_object(
    'located', v_lat IS NOT NULL AND v_lng IS NOT NULL,
    'city', v_city,
    'postal_code', v_postal,
    'departement', CASE WHEN v_dept_name IS NULL THEN NULL ELSE v_dept END,
    'departement_name', v_dept_name,
    'open_sits', jsonb_build_object(
      'r100', CASE WHEN v_lat IS NULL OR v_lng IS NULL THEN NULL ELSE (
        SELECT count(*) FROM public.sits s JOIN public.profiles o ON o.id = s.user_id
         WHERE s.status = 'published' AND s.user_id <> v_uid
           AND coalesce(s.end_date, current_date) >= current_date
           AND coalesce(s.accepting_applications, true)
           AND coalesce(s.country, 'FR') = 'FR'
           AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
           AND public.haversine_km(v_lat, v_lng, o.latitude, o.longitude) <= 100) END,
      'departement', CASE WHEN v_dept_name IS NULL THEN NULL ELSE (
        SELECT count(*) FROM public.sits s
         WHERE s.status = 'published' AND s.user_id <> v_uid
           AND coalesce(s.end_date, current_date) >= current_date
           AND coalesce(s.accepting_applications, true)
           AND coalesce(s.country, 'FR') = 'FR'
           AND s.departement_code = v_dept) END,
      'france', (
        SELECT count(*) FROM public.sits s
         WHERE s.status = 'published' AND s.user_id <> v_uid
           AND coalesce(s.end_date, current_date) >= current_date
           AND coalesce(s.accepting_applications, true)
           AND coalesce(s.country, 'FR') = 'FR')
    ),
    -- Zones de gardes déjà suivies (alertes actives qui portent les gardes).
    'alerts', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'zone_type', a.zone_type, 'radius_km', a.radius_km,
               'departement', a.departement, 'region_code', a.region_code))
        FROM public.alert_preferences a
       WHERE a.user_id = v_uid AND a.active AND 'gardes' = ANY (a.alert_types)), '[]'::jsonb),
    'active_alerts', (
      SELECT count(*) FROM public.alert_preferences a WHERE a.user_id = v_uid AND a.active)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_alert_zone_options() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_alert_zone_options() TO authenticated, service_role;
