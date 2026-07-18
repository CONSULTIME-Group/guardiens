
CREATE OR REPLACE FUNCTION public.get_nearby_helpers(
  p_max_results integer DEFAULT 8,
  p_max_radius_km double precision DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  first_name text,
  avatar_url text,
  city text,
  skill_categories text[],
  custom_skills jsonb,
  bio text,
  identity_verified boolean,
  completed_sits_count integer,
  distance_km double precision,
  has_geo boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_lat double precision;
  v_lng double precision;
  v_has_geo boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT p.latitude, p.longitude
    INTO v_lat, v_lng
    FROM public.profiles p
   WHERE p.id = v_uid;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    SELECT pp.latitude_approx, pp.longitude_approx
      INTO v_lat, v_lng
      FROM public.public_profiles pp
     WHERE pp.id = v_uid;
  END IF;

  v_has_geo := v_lat IS NOT NULL AND v_lng IS NOT NULL;

  IF v_has_geo THEN
    RETURN QUERY
    SELECT
      p.id,
      p.first_name,
      p.avatar_url,
      p.city,
      COALESCE(p.skill_categories, ARRAY[]::text[]),
      COALESCE(p.custom_skills, '[]'::jsonb),
      p.bio,
      COALESCE(p.identity_verified, false),
      COALESCE(p.completed_sits_count, 0),
      public.haversine_km(v_lat, v_lng, p.latitude, p.longitude) AS distance_km,
      true AS has_geo
    FROM public.profiles p
    WHERE p.available_for_help = true
      AND p.id <> v_uid
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND (
        (p.skill_categories IS NOT NULL AND array_length(p.skill_categories, 1) > 0)
        OR (p.custom_skills IS NOT NULL AND jsonb_typeof(p.custom_skills) = 'array' AND jsonb_array_length(p.custom_skills) > 0)
      )
      AND public.haversine_km(v_lat, v_lng, p.latitude, p.longitude) <= p_max_radius_km
    ORDER BY distance_km ASC
    LIMIT GREATEST(p_max_results, 0);
  ELSE
    RETURN QUERY
    SELECT
      p.id,
      p.first_name,
      p.avatar_url,
      p.city,
      COALESCE(p.skill_categories, ARRAY[]::text[]),
      COALESCE(p.custom_skills, '[]'::jsonb),
      p.bio,
      COALESCE(p.identity_verified, false),
      COALESCE(p.completed_sits_count, 0),
      NULL::double precision AS distance_km,
      false AS has_geo
    FROM public.profiles p
    WHERE p.available_for_help = true
      AND p.id <> v_uid
      AND (
        (p.skill_categories IS NOT NULL AND array_length(p.skill_categories, 1) > 0)
        OR (p.custom_skills IS NOT NULL AND jsonb_typeof(p.custom_skills) = 'array' AND jsonb_array_length(p.custom_skills) > 0)
      )
    ORDER BY COALESCE(p.identity_verified, false) DESC, COALESCE(p.completed_sits_count, 0) DESC
    LIMIT GREATEST(p_max_results, 0);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_helpers(integer, double precision) TO authenticated;
