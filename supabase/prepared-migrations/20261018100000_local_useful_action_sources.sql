-- Une seule lecture membre pour les coups de main, projets et actions associatives.
-- Lecture seule, privilèges du membre conservés ; aucun contenu existant n'est modifié.
BEGIN;

CREATE OR REPLACE FUNCTION public.local_useful_action_sources()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
WITH me AS (
  SELECT p.id, p.latitude::double precision AS lat, p.longitude::double precision AS lng
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.latitude BETWEEN -90 AND 90 AND p.longitude BETWEEN -180 AND 180
    AND NOT (p.latitude = 0 AND p.longitude = 0)
), mission_candidates AS (
  SELECT m.id, m.user_id, m.slug, m.title, m.description, m.city, m.category,
    m.latitude, m.longitude, m.status, m.mission_type, m.accepting_applications,
    m.date_needed, m.end_date, m.created_at, m.duration_estimate,
    m.savoir_faire_attendus, m.savoir_faire_transmis,
    6371.0 * acos(least(1.0, greatest(-1.0,
      sin(radians(p.lat)) * sin(radians(m.latitude::double precision))
      + cos(radians(p.lat)) * cos(radians(m.latitude::double precision))
        * cos(radians(m.longitude::double precision - p.lng))))) AS distance_km
  FROM public.public_small_missions m CROSS JOIN me p
  WHERE m.status = 'open' AND m.user_id <> p.id
    AND m.mission_type IS DISTINCT FROM 'offre'
    AND m.accepting_applications IS DISTINCT FROM false
    AND m.latitude BETWEEN -90 AND 90 AND m.longitude BETWEEN -180 AND 180
    AND NOT (m.latitude = 0 AND m.longitude = 0)
    AND (coalesce(m.end_date, m.date_needed) >= (now() AT TIME ZONE 'Europe/Paris')::date
      OR (m.end_date IS NULL AND m.date_needed IS NULL AND m.created_at >= now() - interval '30 days'))
), missions AS (
  SELECT * FROM mission_candidates WHERE distance_km <= 30
  ORDER BY distance_km, created_at DESC, id LIMIT 200
), association_points AS (
  SELECT a.slug, a.name, a.needs_details,
    CASE WHEN jsonb_typeof(n.value->'local_action'->'latitude') = 'number' THEN
      CASE WHEN (n.value->'local_action'->>'latitude')::numeric BETWEEN -90 AND 90
        THEN (n.value->'local_action'->>'latitude')::double precision END END AS lat,
    CASE WHEN jsonb_typeof(n.value->'local_action'->'longitude') = 'number' THEN
      CASE WHEN (n.value->'local_action'->>'longitude')::numeric BETWEEN -180 AND 180
        THEN (n.value->'local_action'->>'longitude')::double precision END END AS lng
  FROM public.public_animal_associations a
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.needs_details) = 'array' THEN a.needs_details ELSE '[]'::jsonb END) n(value)
  WHERE n.value->'local_action'->'enabled' = 'true'::jsonb
), association_distances AS (
  SELECT a.slug, a.name, a.needs_details,
    6371.0 * acos(least(1.0, greatest(-1.0,
      sin(radians(p.lat)) * sin(radians(a.lat))
      + cos(radians(p.lat)) * cos(radians(a.lat)) * cos(radians(a.lng - p.lng))))) AS distance_km
  FROM association_points a CROSS JOIN me p
  WHERE a.lat IS NOT NULL AND a.lng IS NOT NULL AND NOT (a.lat = 0 AND a.lng = 0)
), associations AS (
  SELECT slug, name, needs_details, min(distance_km) AS distance_km
  FROM association_distances WHERE distance_km <= 30
  GROUP BY slug, name, needs_details ORDER BY min(distance_km), slug LIMIT 200
), skills AS (
  SELECT unnest(o.competences) AS skill FROM public.owner_profiles o JOIN me p ON p.id = o.user_id
  UNION
  SELECT unnest(s.competences) FROM public.sitter_profiles s JOIN me p ON p.id = s.user_id
), interests AS (
  SELECT unnest(o.interests) AS interest FROM public.owner_profiles o JOIN me p ON p.id = o.user_id
  UNION
  SELECT unnest(s.interests) FROM public.sitter_profiles s JOIN me p ON p.id = s.user_id
)
SELECT jsonb_build_object(
  'point', (SELECT jsonb_build_object('latitude',lat,'longitude',lng) FROM me),
  'skills', coalesce((SELECT jsonb_agg(skill ORDER BY skill) FROM skills WHERE btrim(skill) <> ''), '[]'::jsonb),
  'interests', coalesce((SELECT jsonb_agg(interest ORDER BY interest) FROM interests WHERE btrim(interest) <> ''), '[]'::jsonb),
  'missions', coalesce((SELECT jsonb_agg(to_jsonb(m) - 'distance_km' ORDER BY m.distance_km, m.created_at DESC, m.id) FROM missions m), '[]'::jsonb),
  'associations', coalesce((SELECT jsonb_agg(to_jsonb(a) - 'distance_km' ORDER BY a.distance_km, a.slug) FROM associations a), '[]'::jsonb)
);
$function$;

REVOKE ALL ON FUNCTION public.local_useful_action_sources() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.local_useful_action_sources() TO authenticated;

COMMIT;
