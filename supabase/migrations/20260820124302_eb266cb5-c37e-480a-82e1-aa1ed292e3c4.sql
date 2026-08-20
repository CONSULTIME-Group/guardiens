-- Décision de Jérémie, 20/08/2026 : « tri, on filtre jamais ».
-- Aucun filtre de pool n'est admis, quel que soit son motif, hors
-- incompatibilité déclarée en distribution sortante. Identité vérifiée,
-- complétude, ancienneté, note, abonnement : tout se trie, rien ne filtre.

-- 1. get_owner_top_3_sitters : dépréciée, plus aucun appelant (le Top 3
-- propriétaire et la distribution passent par le moteur unique TypeScript
-- partagé computeAffinityResultFull). Choix de la dépréciation plutôt que de
-- l'alignement : réécrire le moteur en SQL recréerait le second moteur qu'on
-- vient de supprimer. Le corps est quand même purgé de ses trois
-- éliminations : identité vérifiée, complétude 60 %, score non NULL.
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
  v_pool_total integer;
  v_cap CONSTANT integer := 300;
BEGIN
  SELECT latitude, longitude INTO owner_lat, owner_lng
  FROM public.profiles WHERE id = _owner_id;

  -- Vivier complet : rôle gardien ou polyvalent, compte actif. Aucun filtre
  -- de confiance.
  SELECT count(*) INTO v_pool_total
  FROM public.profiles p
  WHERE p.role IN ('sitter', 'both')
    AND p.account_status = 'active'
    AND p.id <> _owner_id;

  -- Plafond de charge : distance croissante AVANT plafonnement, et tracé.
  IF v_pool_total > v_cap THEN
    RAISE NOTICE 'get_owner_top_3_sitters : plafond % atteint, % gardiens les plus éloignés écartés du scoring', v_cap, v_pool_total - v_cap;
  END IF;

  RETURN QUERY
  WITH pool AS (
    SELECT
      p.id,
      p.first_name,
      p.city,
      p.avatar_url,
      CASE
        WHEN owner_lat IS NOT NULL AND owner_lng IS NOT NULL
             AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        THEN public.haversine_km(owner_lat, owner_lng, p.latitude, p.longitude)::numeric
        ELSE NULL
      END AS dist_km
    FROM public.profiles p
    WHERE p.role IN ('sitter', 'both')
      AND p.account_status = 'active'
      AND p.id <> _owner_id
    ORDER BY dist_km ASC NULLS LAST
    LIMIT v_cap
  ),
  scored AS (
    SELECT
      pool.id AS sitter_id,
      pool.first_name,
      pool.city,
      pool.avatar_url,
      public.calculate_affinity_score_pg(_owner_id, pool.id) AS affinity_score,
      pool.dist_km AS distance_km
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
  ORDER BY
    s.affinity_score DESC NULLS LAST,
    s.distance_km ASC NULLS LAST
  LIMIT 3;
END;
$$;

COMMENT ON FUNCTION public.get_owner_top_3_sitters(uuid) IS
  'DÉPRÉCIÉE le 20/08/2026 : plus aucun appelant, le Top 3 propriétaire et la distribution passent par le moteur unique computeAffinityResultFull (TypeScript partagé). Conservée pour historique, purgée de ses filtres d''élimination (identité vérifiée, complétude, score non NULL). Ne pas utiliser dans du nouveau code.';

-- 2. count_eligible_sitters : la confiance ne filtre plus le comptage. Le
-- compteur mesure le vivier réellement joignable (rôle, compte actif,
-- coordonnées, rayon), la même vérité que la file de distribution.
CREATE OR REPLACE FUNCTION public.count_eligible_sitters(
  p_lat double precision,
  p_lng double precision,
  p_radius_km integer DEFAULT 30
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles p
  WHERE p.role IN ('sitter', 'both')
    AND COALESCE(p.account_status, 'active') = 'active'
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p_lat IS NOT NULL
    AND p_lng IS NOT NULL
    AND (
      6371 * acos(
        LEAST(1.0,
          cos(radians(p_lat)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(p.latitude))
        )
      )
    ) <= p_radius_km;
$$;

COMMENT ON FUNCTION public.count_eligible_sitters(double precision, double precision, integer) IS
  'Vivier de gardiens actifs dans un rayon. Depuis le 20/08/2026, identité vérifiée et complétude ne filtrent plus (tri, jamais de filtre de pool) : le compteur reflète la distribution réelle.';

-- 3. Bloc Liquidité admin : même définition de vivier complet.
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

  -- Gardiens éligibles : vivier réel (rôle gardien ou polyvalent, compte
  -- actif, coordonnées connues), à 100 km ou moins d'au moins une annonce
  -- publiée. Identité vérifiée et complétude ne filtrent plus (décision du
  -- 20/08/2026 : tri, jamais de filtre de pool), la liquidité mesure le
  -- vivier entier. Position de l'annonce : ville géocodée si présente dans
  -- geocode_cache, sinon coordonnées du profil propriétaire.
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
    AND COALESCE(pr.account_status, 'active') = 'active'
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

-- 4. Entraide : la complétude ne conditionne plus la notification d'une
-- nouvelle mission. Restent la délivrabilité et le consentement : email
-- connu, opt-in, non supprimé, dans le rayon.
CREATE OR REPLACE FUNCTION public.enqueue_helpers_for_new_mission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_radius_km numeric := 30;
BEGIN
  IF NEW.status <> 'open' OR NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.mission_notification_queue (helper_id, mission_id, distance_km)
  SELECT
    p.id,
    NEW.id,
    ROUND(
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(NEW.latitude::double precision))
            * cos(radians(p.latitude::double precision))
            * cos(radians(p.longitude::double precision) - radians(NEW.longitude::double precision))
            + sin(radians(NEW.latitude::double precision))
            * sin(radians(p.latitude::double precision))
          ))
        )
      )::numeric,
      2
    ) AS distance_km
  FROM public.profiles p
  LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
  LEFT JOIN public.suppressed_emails se ON lower(se.email) = lower(p.email)
  WHERE p.id <> NEW.user_id
    AND p.email IS NOT NULL
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND COALESCE(ep.new_mission_digest, true) = true
    AND COALESCE(ep.product_emails, true) = true
    AND se.email IS NULL
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(NEW.latitude::double precision))
          * cos(radians(p.latitude::double precision))
          * cos(radians(p.longitude::double precision) - radians(NEW.longitude::double precision))
          + sin(radians(NEW.latitude::double precision))
          * sin(radians(p.latitude::double precision))
        ))
      )
    ) <= v_radius_km
  ON CONFLICT (helper_id, mission_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 5. Compteur d'audience pré-publication entraide : aligné sur la file
-- réelle (le seuil de complétude 40 % disparaît aussi ici, sinon le chiffre
-- affiché mentirait sur la distribution).
CREATE OR REPLACE FUNCTION public.count_mission_notification_audience(
  p_lat double precision,
  p_lng double precision,
  p_radius_km integer DEFAULT 30
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.profiles p
  LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
  LEFT JOIN public.suppressed_emails se ON lower(se.email) = lower(p.email)
  WHERE p_lat IS NOT NULL
    AND p_lng IS NOT NULL
    AND p.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND p.email IS NOT NULL
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND COALESCE(ep.new_mission_digest, true) = true
    AND COALESCE(ep.product_emails, true) = true
    AND se.email IS NULL
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(p.latitude))
          * cos(radians(p.longitude) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(p.latitude))
        ))
      )
    ) <= p_radius_km;
$function$;