CREATE OR REPLACE FUNCTION public.get_owner_nurturing_context(_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _first_name text;
  _city text;
  _postal_code text;
  _lat double precision;
  _lng double precision;
  _profile_completion integer;
  _radius_km integer := 30;
  _nearby_count integer := 0;
  _top_names text[] := ARRAY[]::text[];
  _top_sitters jsonb := '[]'::jsonb;
BEGIN
  SELECT p.first_name, p.city, p.postal_code, p.latitude, p.longitude, p.profile_completion
    INTO _first_name, _city, _postal_code, _lat, _lng, _profile_completion
  FROM public.profiles p
  WHERE p.id = _owner_id;

  IF _lat IS NOT NULL AND _lng IS NOT NULL THEN
    WITH nearby AS MATERIALIZED (
      SELECT
        p.id,
        p.first_name,
        p.city,
        p.avatar_url,
        p.identity_verified,
        p.last_seen_at,
        public.haversine_km(_lat, _lng, p.latitude, p.longitude) AS distance_km
      FROM public.profiles p
      WHERE p.id <> _owner_id
        AND p.role IN ('sitter', 'both')
        AND p.account_status = 'active'
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND public.haversine_km(_lat, _lng, p.latitude, p.longitude) < _radius_km
    ), ranked AS MATERIALIZED (
      SELECT *
      FROM nearby
      ORDER BY
        (identity_verified IS TRUE AND NULLIF(btrim(avatar_url), '') IS NOT NULL) DESC,
        last_seen_at DESC NULLS LAST,
        distance_km ASC,
        id ASC
      LIMIT 3
    )
    SELECT
      (SELECT count(*) FROM nearby),
      COALESCE(
        (SELECT array_agg(
          r.first_name || CASE WHEN r.city IS NOT NULL THEN ' (' || r.city || ')' ELSE '' END
          ORDER BY
            (r.identity_verified IS TRUE AND NULLIF(btrim(r.avatar_url), '') IS NOT NULL) DESC,
            r.last_seen_at DESC NULLS LAST,
            r.distance_km ASC,
            r.id ASC
        ) FROM ranked r WHERE r.first_name IS NOT NULL),
        ARRAY[]::text[]
      ),
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'first_name', r.first_name,
            'city', r.city,
            'avatar_url', r.avatar_url,
            'distance_km', round(r.distance_km::numeric)::integer,
            'url', 'https://guardiens.fr/gardiens/' || r.id::text
          )
          ORDER BY
            (r.identity_verified IS TRUE AND NULLIF(btrim(r.avatar_url), '') IS NOT NULL) DESC,
            r.last_seen_at DESC NULLS LAST,
            r.distance_km ASC,
            r.id ASC
        ) FROM ranked r),
        '[]'::jsonb
      )
    INTO _nearby_count, _top_names, _top_sitters;
  END IF;

  RETURN jsonb_build_object(
    'first_name', _first_name,
    'city', _city,
    'postal_code', _postal_code,
    'profile_completion', COALESCE(_profile_completion, 0),
    'nearby_sitters_count', COALESCE(_nearby_count, 0),
    'radius_km', _radius_km,
    'top_3_sitter_names', COALESCE(_top_names, ARRAY[]::text[]),
    'top_3_sitters', COALESCE(_top_sitters, '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_owner_nurturing_context(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_owner_nurturing_context(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_owner_nurturing_context(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_nurturing_context(uuid) TO service_role;

COMMENT ON FUNCTION public.get_owner_nurturing_context(uuid) IS 'Contexte des relances proprietaire. Compte tous les gardiens actifs a moins de 30 km et retourne les trois profils prioritaires. Execution reservee au service_role, la fonction expose des distances calculees sur des coordonnees exactes.';