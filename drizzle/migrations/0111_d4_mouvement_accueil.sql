-- Lot D4 (09/11/2026, arène claude/arene/2026-11-09-dashboards-desktop, lots 2
-- et 3 réunis, « ok go enchaine » de Jérémie) : ce qui a bougé près du membre,
-- pour le bandeau « Depuis votre dernière visite » de l'accueil ordinateur, et
-- les chiffres de « Guardiens aujourd'hui ».
--
-- Lecture seule : aucune écriture, aucun repère posé (le repère de visite reste
-- dans le navigateur, get_activity_since_last_visit est inchangée).
-- Deux fenêtres : depuis p_since (borné à 30 jours) et les 7 derniers jours.
-- Distances exactes par haversine_km entre le profil du membre et le profil
-- du propriétaire (gardes), le point du besoin (entraide) ou le profil du
-- nouveau membre. Rejouable. Membre connecté seulement.
CREATE OR REPLACE FUNCTION public.get_dashboard_movement(p_since timestamptz DEFAULT NULL)
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
  v_week timestamptz := now() - interval '7 days';
  v_since timestamptz;
  v_reviews_count integer;
  v_reviews_avg numeric;
  v_nearest jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  v_since := greatest(coalesce(p_since, v_week), now() - interval '30 days');

  SELECT p.latitude, p.longitude INTO v_lat, v_lng FROM public.profiles p WHERE p.id = v_uid;

  SELECT count(*)::integer, round(avg(r.overall_rating)::numeric, 1)
    INTO v_reviews_count, v_reviews_avg
    FROM public.reviews r
   WHERE r.published = true
     AND r.moderation_hidden_at IS NULL
     AND r.overall_rating IS NOT NULL
     AND coalesce(r.review_type, 'garde') = 'garde';

  IF v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
    SELECT jsonb_build_object(
             'sit_id', x.id, 'city', x.city, 'start_date', x.start_date,
             'distance_km', round(x.d::numeric, 0))
      INTO v_nearest
      FROM (
        SELECT s.id, s.city, s.start_date,
               public.haversine_km(v_lat, v_lng, o.latitude, o.longitude) AS d
          FROM public.sits s
          JOIN public.profiles o ON o.id = s.user_id
         WHERE s.status = 'published'
           AND s.user_id <> v_uid
           AND coalesce(s.end_date, current_date) >= current_date
           AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
         ORDER BY d ASC
         LIMIT 1
      ) x;
  END IF;

  RETURN jsonb_build_object(
    'since', v_since,
    'located', v_lat IS NOT NULL AND v_lng IS NOT NULL,
    'windows', jsonb_build_object(
      'since', public.dashboard_movement_counts(v_uid, v_lat, v_lng, v_since),
      'week', public.dashboard_movement_counts(v_uid, v_lat, v_lng, v_week)
    ),
    'nearest_sit', v_nearest,
    'community', jsonb_build_object(
      'departments', (
        SELECT count(DISTINCT left(p.postal_code, 2))
          FROM public.profiles p
         WHERE p.postal_code ~ '^[0-9]{5}$'
           AND coalesce(p.account_status, 'active') <> 'deleted'),
      'new_members_7d', (
        SELECT count(*) FROM public.profiles p
         WHERE p.created_at >= v_week
           AND coalesce(p.account_status, 'active') <> 'deleted'),
      'identities_verified', (
        SELECT count(*) FROM public.profiles p
         WHERE p.identity_verified = true
           AND coalesce(p.account_status, 'active') <> 'deleted'),
      'reviews_count', v_reviews_count,
      'reviews_avg', CASE WHEN v_reviews_count >= 5 THEN v_reviews_avg END
    )
  );
END;
$function$;

-- Compteurs d'une fenêtre. Fonction interne, jamais appelée par le site.
CREATE OR REPLACE FUNCTION public.dashboard_movement_counts(
  p_uid uuid, p_lat double precision, p_lng double precision, p_from timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    -- Gardes publiées depuis p_from, encore ouvertes, à 50 km au plus.
    'new_sits_50', CASE WHEN p_lat IS NULL OR p_lng IS NULL THEN 0 ELSE (
      SELECT count(*) FROM public.sits s JOIN public.profiles o ON o.id = s.user_id
       WHERE s.published_at >= p_from AND s.status = 'published' AND s.user_id <> p_uid
         AND coalesce(s.end_date, current_date) >= current_date
         AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
         AND public.haversine_km(p_lat, p_lng, o.latitude, o.longitude) <= 50) END,
    -- Gardes publiées depuis p_from à 30 km au plus (côté propriétaire).
    'new_sits_30', CASE WHEN p_lat IS NULL OR p_lng IS NULL THEN 0 ELSE (
      SELECT count(*) FROM public.sits s JOIN public.profiles o ON o.id = s.user_id
       WHERE s.published_at >= p_from AND s.status IN ('published', 'confirmed') AND s.user_id <> p_uid
         AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
         AND public.haversine_km(p_lat, p_lng, o.latitude, o.longitude) <= 30) END,
    -- Besoins d'entraide ouverts déposés depuis p_from à 30 km au plus.
    'new_needs_30', CASE WHEN p_lat IS NULL OR p_lng IS NULL THEN 0 ELSE (
      SELECT count(*) FROM public.small_missions m
       WHERE m.created_at >= p_from AND m.status = 'open' AND m.user_id <> p_uid
         AND m.mission_type = 'besoin' AND m.category::text <> 'projet'
         AND m.hidden_at IS NULL AND m.moderation_hidden_at IS NULL
         AND m.latitude IS NOT NULL AND m.longitude IS NOT NULL
         AND public.haversine_km(p_lat, p_lng, m.latitude::double precision, m.longitude::double precision) <= 30) END,
    -- Nouveaux gardiens (gardien ou double rôle) à 30 km au plus.
    'new_sitters_30', CASE WHEN p_lat IS NULL OR p_lng IS NULL THEN 0 ELSE (
      SELECT count(*) FROM public.profiles p
       WHERE p.created_at >= p_from AND p.id <> p_uid
         AND p.role IN ('sitter', 'both')
         AND coalesce(p.account_status, 'active') <> 'deleted'
         AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
         AND public.haversine_km(p_lat, p_lng, p.latitude, p.longitude) <= 30) END,
    -- Nouveaux membres, tous rôles, à 30 km au plus.
    'new_members_30', CASE WHEN p_lat IS NULL OR p_lng IS NULL THEN 0 ELSE (
      SELECT count(*) FROM public.profiles p
       WHERE p.created_at >= p_from AND p.id <> p_uid
         AND coalesce(p.account_status, 'active') <> 'deleted'
         AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
         AND public.haversine_km(p_lat, p_lng, p.latitude, p.longitude) <= 30) END,
    -- Candidatures reçues sur les annonces du membre.
    'new_applications', (
      SELECT count(*) FROM public.applications a JOIN public.sits s ON s.id = a.sit_id
       WHERE s.user_id = p_uid AND a.created_at >= p_from AND a.status <> 'cancelled'),
    -- Candidatures du membre lues par un propriétaire.
    'applications_viewed', (
      SELECT count(*) FROM public.applications a
       WHERE a.sitter_id = p_uid AND a.viewed_at >= p_from)
  );
$function$;

REVOKE ALL ON FUNCTION public.get_dashboard_movement(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_movement(timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.dashboard_movement_counts(uuid, double precision, double precision, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_movement_counts(uuid, double precision, double precision, timestamptz) TO service_role;