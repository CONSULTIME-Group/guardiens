-- Lot HOME1 (13 novembre 2026) : le compteur de proximité de la home dit un
-- seul chiffre, le nombre de membres inscrits à moins de 30 km.
-- Fonction nouvelle, home_proximity_counts reste telle quelle pour le site
-- déjà en ligne. Repère : home1_membres_a_proximite.
CREATE OR REPLACE FUNCTION public.home_members_nearby(
  p_lat double precision,
  p_lng double precision
)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- home1_membres_a_proximite : même arrondi et même rayon que home_proximity_counts.
  WITH origin AS (
    SELECT round(p_lat::numeric, 2)::double precision AS lat,
           round(p_lng::numeric, 2)::double precision AS lng
    WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
  )
  SELECT count(*)::integer
  FROM public.profiles p CROSS JOIN origin
  WHERE p.account_status = 'active'
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND 6371 * acos(least(1.0, greatest(-1.0,
          cos(radians(origin.lat)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(origin.lng)) +
          sin(radians(origin.lat)) * sin(radians(p.latitude))
        ))) <= 30;
$function$;

COMMENT ON FUNCTION public.home_members_nearby(double precision, double precision) IS
  'Lot HOME1 : nombre de membres actifs situés à moins de 30 km d''un point arrondi à deux décimales. Un compte, aucune donnée de membre.';
REVOKE ALL ON FUNCTION public.home_members_nearby(double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.home_members_nearby(double precision, double precision) TO anon, authenticated, service_role;
