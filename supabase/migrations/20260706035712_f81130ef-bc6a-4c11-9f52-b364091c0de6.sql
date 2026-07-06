
-- ============================================================
-- RPC: contexte de personnalisation pour les emails owner nurturing
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_owner_nurturing_context(_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _first_name text;
  _city text;
  _postal_code text;
  _lat double precision;
  _lng double precision;
  _profile_completion int;
  _radius_km int := 30;
  _nearby_count int := 0;
  _top_names text[] := ARRAY[]::text[];
BEGIN
  SELECT p.first_name, p.city, p.latitude, p.longitude, p.profile_completion
    INTO _first_name, _city, _lat, _lng, _profile_completion
  FROM public.profiles p
  WHERE p.id = _owner_id;

  IF _lat IS NOT NULL AND _lng IS NOT NULL THEN
    WITH nearby AS (
      SELECT
        p.first_name,
        p.city,
        p.last_seen_at,
        public.haversine_km(_lat, _lng, p.latitude, p.longitude) AS dist_km
      FROM public.profiles p
      JOIN public.sitter_profiles sp ON sp.user_id = p.id
      WHERE p.id <> _owner_id
        AND p.role IN ('sitter', 'both')
        AND p.identity_verified = true
        AND p.account_status = 'active'
        AND p.profile_completion >= 60
        AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND (p.last_seen_at IS NULL OR p.last_seen_at >= now() - interval '90 days')
        AND public.haversine_km(_lat, _lng, p.latitude, p.longitude) <= _radius_km
    )
    SELECT
      count(*),
      COALESCE(
        (SELECT array_agg(x.name) FROM (
          SELECT (n.first_name || CASE WHEN n.city IS NOT NULL THEN ' (' || n.city || ')' ELSE '' END) AS name
          FROM nearby n
          WHERE n.first_name IS NOT NULL
          ORDER BY n.last_seen_at DESC NULLS LAST, n.dist_km ASC
          LIMIT 3
        ) x),
        ARRAY[]::text[]
      )
    INTO _nearby_count, _top_names
    FROM nearby;
  END IF;

  RETURN jsonb_build_object(
    'first_name', _first_name,
    'city', _city,
    'postal_code', _postal_code,
    'profile_completion', COALESCE(_profile_completion, 0),
    'nearby_sitters_count', COALESCE(_nearby_count, 0),
    'radius_km', _radius_km,
    'top_3_sitter_names', COALESCE(_top_names, ARRAY[]::text[])
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_owner_nurturing_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_owner_nurturing_context(uuid) TO authenticated, service_role;

-- ============================================================
-- Étape J+21 pour la séquence owner-no-sit-relance
-- ============================================================
INSERT INTO public.nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition, send_condition)
SELECT
  s.id,
  3,
  504,
  'owner-no-sit-j21',
  '{"type": "has_published_sit"}'::jsonb,
  '{}'::jsonb
FROM public.nurturing_sequences s
WHERE s.key = 'owner-no-sit-relance'
  AND NOT EXISTS (
    SELECT 1 FROM public.nurturing_steps ns
    WHERE ns.sequence_id = s.id AND ns.step_order = 3
  );
