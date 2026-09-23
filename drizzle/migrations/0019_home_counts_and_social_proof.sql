CREATE OR REPLACE FUNCTION public.home_proximity_counts(
  p_lat double precision,
  p_lng double precision
)
RETURNS TABLE(gardiens_count integer, helpers_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH origin AS (
    SELECT round(p_lat::numeric, 2)::double precision AS lat,
           round(p_lng::numeric, 2)::double precision AS lng
    WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
  ), eligible AS (
    SELECT p.role, p.available_for_help,
      6371 * acos(least(1.0, greatest(-1.0,
        cos(radians(origin.lat)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(origin.lng)) +
        sin(radians(origin.lat)) * sin(radians(p.latitude))
      ))) AS distance_km
    FROM public.profiles p CROSS JOIN origin
    WHERE p.account_status = 'active'
      AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  )
  SELECT
    count(*) FILTER (WHERE role IN ('sitter'::public.user_role, 'both'::public.user_role) AND distance_km <= 30)::integer,
    count(*) FILTER (WHERE available_for_help IS TRUE AND distance_km <= 30)::integer
  FROM eligible;
$function$;

COMMENT ON FUNCTION public.home_proximity_counts(double precision, double precision) IS
  'Deux compteurs publics agrégés dans un rayon de 30 km pour la home.';
REVOKE ALL ON FUNCTION public.home_proximity_counts(double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.home_proximity_counts(double precision, double precision) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.home_social_proof()
RETURNS TABLE(proof_type text, first_name text, city text, proof_text text, happened_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH eligible_reviews AS (
    SELECT 'avis'::text AS proof_type, author.first_name, author.city,
      left(btrim(r.comment), 500) AS proof_text, r.created_at AS happened_at
    FROM public.reviews r
    JOIN public.profiles author ON author.id = r.reviewer_id
    WHERE r.published IS TRUE
      AND r.moderation_status = 'valide'
      AND r.moderation_hidden_at IS NULL
      AND btrim(COALESCE(r.comment, '')) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id IN (r.reviewer_id, r.reviewee_id)
          AND ur.role = 'admin'::public.app_role
      )
  ), eligible_help AS (
    SELECT 'entraide'::text AS proof_type, giver.first_name,
      COALESCE(giver.city, m.city) AS city, left(btrim(f.comment), 500) AS proof_text,
      f.created_at AS happened_at
    FROM public.mission_feedbacks f
    JOIN public.small_missions m ON m.id = f.mission_id
    JOIN public.profiles giver ON giver.id = f.giver_id
    WHERE f.positive IS TRUE AND f.public_ok IS TRUE
      AND btrim(COALESCE(f.comment, '')) <> ''
      AND m.close_reason = 'meetup_confirmed'
      AND m.moderation_hidden_at IS NULL AND m.hidden_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id IN (f.giver_id, f.receiver_id)
          AND ur.role = 'admin'::public.app_role
      )
  )
  SELECT proof_type, first_name, city, proof_text, happened_at
  FROM (SELECT * FROM eligible_reviews UNION ALL SELECT * FROM eligible_help) proofs
  WHERE btrim(COALESCE(first_name, '')) <> '' AND happened_at IS NOT NULL
  ORDER BY happened_at DESC LIMIT 6;
$function$;

COMMENT ON FUNCTION public.home_social_proof() IS
  'Preuves sociales publiques de la home, hors contenus impliquant un administrateur.';
REVOKE ALL ON FUNCTION public.home_social_proof() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.home_social_proof() TO anon, authenticated, service_role;