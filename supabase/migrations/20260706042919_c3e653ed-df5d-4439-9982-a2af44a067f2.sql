CREATE OR REPLACE FUNCTION public.get_owner_top_3_sitters(_owner_id uuid)
RETURNS TABLE (
  sitter_id uuid,
  first_name text,
  city text,
  avatar_url text,
  affinity_score integer,
  distance_km numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_lat double precision;
  owner_lng double precision;
BEGIN
  SELECT latitude, longitude INTO owner_lat, owner_lng
  FROM public.profiles WHERE id = _owner_id;

  RETURN QUERY
  WITH pool AS (
    SELECT
      p.id,
      p.first_name,
      p.city,
      p.avatar_url,
      p.latitude,
      p.longitude
    FROM public.profiles p
    WHERE p.role IN ('sitter','both')
      AND p.account_status = 'active'
      AND p.identity_verified = true
      AND p.profile_completion >= 60
      AND p.id <> _owner_id
    LIMIT 300
  ),
  scored AS (
    SELECT
      pool.id AS sitter_id,
      pool.first_name,
      pool.city,
      pool.avatar_url,
      public.calculate_affinity_score_pg(_owner_id, pool.id) AS affinity_score,
      CASE
        WHEN owner_lat IS NOT NULL AND owner_lng IS NOT NULL
             AND pool.latitude IS NOT NULL AND pool.longitude IS NOT NULL
        THEN public.haversine_km(owner_lat, owner_lng, pool.latitude, pool.longitude)::numeric
        ELSE NULL
      END AS distance_km
    FROM pool
  )
  SELECT
    s.sitter_id,
    s.first_name,
    s.city,
    s.avatar_url,
    s.affinity_score,
    ROUND(s.distance_km, 1) AS distance_km
  FROM scored s
  WHERE s.affinity_score IS NOT NULL
  ORDER BY
    s.affinity_score DESC NULLS LAST,
    s.distance_km ASC NULLS LAST
  LIMIT 3;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_top_3_sitters(uuid) TO authenticated, service_role;