CREATE OR REPLACE FUNCTION public.admin_liquidity_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_window CONSTANT interval := interval '90 days';
  v_active_listings integer;
  v_eligible_sitters integer;
  v_pending_count integer;
  v_pending_oldest_days integer;
  v_response_count integer;
  v_response_median_hours numeric;
  v_conv_accepted integer;
  v_conv_decided integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin')
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO v_active_listings FROM public.sits WHERE status = 'published';

  -- Gardiens éligibles : même définition que count_eligible_sitters (rôle
  -- gardien ou polyvalent, identité vérifiée, profil complété à 60 % ou plus,
  -- coordonnées connues), à 100 km ou moins d'au moins une annonce publiée.
  -- Position de l'annonce : ville géocodée si présente dans geocode_cache,
  -- sinon coordonnées du profil propriétaire (même repli que l'aperçu
  -- d'audience de la création d'annonce).
  WITH sit_points AS (
    SELECT DISTINCT COALESCE(g.lat, p.latitude) AS lat, COALESCE(g.lng, p.longitude) AS lng
    FROM public.sits s
    JOIN public.profiles p ON p.id = s.user_id
    LEFT JOIN public.geocode_cache g ON g.normalized_name = lower(trim(s.city))
    WHERE s.status = 'published'
      AND COALESCE(g.lat, p.latitude) IS NOT NULL
      AND COALESCE(g.lng, p.longitude) IS NOT NULL
  )
  SELECT COUNT(DISTINCT pr.id) INTO v_eligible_sitters
  FROM public.profiles pr
  WHERE pr.role IN ('sitter', 'both')
    AND pr.identity_verified = true
    AND COALESCE(pr.profile_completion, 0) >= 60
    AND pr.latitude IS NOT NULL
    AND pr.longitude IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sit_points sp
      WHERE (6371 * acos(LEAST(1.0,
        cos(radians(sp.lat)) * cos(radians(pr.latitude)) *
        cos(radians(pr.longitude) - radians(sp.lng)) +
        sin(radians(sp.lat)) * sin(radians(pr.latitude))))) <= 100
    );

  -- Candidatures en attente sur une annonce encore publiée.
  SELECT COUNT(*), FLOOR(EXTRACT(epoch FROM now() - MIN(a.created_at)) / 86400)::integer
  INTO v_pending_count, v_pending_oldest_days
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  WHERE a.status = 'pending' AND s.status = 'published';

  -- Délai de première réponse du propriétaire : premier message du
  -- propriétaire dans la conversation liée, déclinaison explicite ou
  -- confirmation de la garde, dans tous les cas postérieur à la candidature.
  WITH apps AS (
    SELECT a.id, a.sit_id, a.sitter_id, a.created_at, a.declined_at
    FROM public.applications a
    WHERE a.created_at >= now() - v_window
  ),
  first_owner_msg AS (
    SELECT c.sit_id, c.sitter_id, MIN(m.created_at) AS at
    FROM public.conversations c
    JOIN public.messages m ON m.conversation_id = c.id AND m.sender_id = c.owner_id
    GROUP BY c.sit_id, c.sitter_id
  ),
  confirms AS (
    SELECT sit_id, MIN(changed_at) AS at
    FROM public.sit_status_history
    WHERE new_status = 'confirmed'
    GROUP BY sit_id
  ),
  resp AS (
    SELECT ap.id,
           LEAST(
             CASE WHEN f.at >= ap.created_at THEN f.at END,
             ap.declined_at,
             CASE WHEN cf.at >= ap.created_at THEN cf.at END
           ) AS response_at,
           ap.created_at
    FROM apps ap
    LEFT JOIN first_owner_msg f ON f.sit_id = ap.sit_id AND f.sitter_id = ap.sitter_id
    LEFT JOIN confirms cf ON cf.sit_id = ap.sit_id
  )
  SELECT COUNT(response_at),
         ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM (response_at - created_at)) / 3600.0))::numeric, 1)
  INTO v_response_count, v_response_median_hours
  FROM resp;

  -- Conversion : candidatures acceptées parmi les candidatures tranchées
  -- (acceptées ou rejetées), hors retraits par le gardien.
  SELECT COUNT(*) FILTER (WHERE status = 'accepted'),
         COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected'))
  INTO v_conv_accepted, v_conv_decided
  FROM public.applications
  WHERE created_at >= now() - v_window;

  RETURN jsonb_build_object(
    'window_days', 90,
    'active_listings', v_active_listings,
    'eligible_sitters', v_eligible_sitters,
    'pending_applications', v_pending_count,
    'pending_oldest_days', v_pending_oldest_days,
    'response_count', v_response_count,
    'response_median_hours', v_response_median_hours,
    'conversion_accepted', v_conv_accepted,
    'conversion_decided', v_conv_decided,
    'generated_at', now()
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_liquidity_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_liquidity_snapshot() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_dashboard_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  affinity_since timestamptz;
  signals_active boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin')
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT applies_since INTO affinity_since
  FROM public.feature_flags WHERE key = 'mandatory_affinity_onboarding';

  SELECT COALESCE(enabled, false) INTO signals_active
  FROM public.feature_flags WHERE key = 'admin_signals_active';

  SELECT jsonb_build_object(
    'signals', CASE WHEN COALESCE(signals_active, false) THEN COALESCE((
      SELECT jsonb_agg(row_to_json(s) ORDER BY
        CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        detected_at DESC)
      FROM (
        SELECT * FROM public.admin_signals
        WHERE resolved_at IS NULL AND severity <> 'info'
        LIMIT 20
      ) s
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    'kpis', jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM public.profiles),
      'owners', (SELECT COUNT(*) FROM public.profiles WHERE role = 'owner'),
      'sitters', (SELECT COUNT(*) FROM public.profiles WHERE role = 'sitter'),
      'both', (SELECT COUNT(*) FROM public.profiles WHERE role = 'both'),
      'new_this_week', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
      'active_listings', (SELECT COUNT(*) FROM public.sits WHERE status = 'published'),
      'ongoing_sits', (SELECT COUNT(*) FROM public.sits WHERE status = 'confirmed'),
      'reviews_count', (SELECT COUNT(*) FROM public.reviews WHERE moderation_status = 'valide' OR published = true),
      'reviews_avg', COALESCE((SELECT AVG(overall_rating)::numeric(3,2) FROM public.reviews WHERE moderation_status = 'valide' OR published = true), 0)
    ),
    'recent_activity', COALESCE((
      SELECT jsonb_agg(row_to_json(r))
      FROM (
        SELECT 'signup' AS type, id, created_at, first_name AS label, role
        FROM public.profiles
        ORDER BY created_at DESC LIMIT 10
      ) r
    ), '[]'::jsonb),
    'seo', jsonb_build_object(
      'articles_published', (SELECT COUNT(*) FROM public.articles WHERE published = true),
      'city_pages_indexable', (SELECT COUNT(*) FROM public.seo_city_pages WHERE published = true AND (noindex IS NULL OR noindex = false)),
      'sitemap_dirty', (SELECT COUNT(*) FROM public.articles WHERE seo_dirty_at IS NOT NULL)
    ),
    'affinity', jsonb_build_object(
      'onboarding_flag_active', (SELECT enabled FROM public.feature_flags WHERE key = 'mandatory_affinity_onboarding'),
      'concerned_signups', CASE
        WHEN affinity_since IS NULL THEN 0
        ELSE (SELECT COUNT(*) FROM public.profiles WHERE created_at >= affinity_since)
      END,
      'onboarding_stale_count', (SELECT COUNT(*) FROM public.detect_affinity_stale())
    ),
    'liquidity', public.admin_liquidity_snapshot(),
    'signals_active', COALESCE(signals_active, false),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$function$;