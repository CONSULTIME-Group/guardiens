-- 1. Distribution : la complétude de profil NE conditionne PAS la distribution
-- (décision de Jérémie, 20/08/2026). Un profil incomplet ne peut pas candidater
-- (garde-fou côté client, useAccessLevel niveau 1), mais il reçoit les annonces :
-- c'est en voyant une garde près de chez lui qu'il comprend pourquoi compléter
-- son profil. Le priver de l'email le laisse dans le noir des deux côtés.
CREATE OR REPLACE FUNCTION public.notify_sitters_on_new_sit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sit_lat double precision;
  sit_lng double precision;
BEGIN
  -- Déclenché uniquement quand l'annonce devient "published"
  IF (TG_OP = 'INSERT' AND NEW.status = 'published')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'published' AND NEW.status = 'published') THEN

    sit_lat := COALESCE(
      (SELECT pr.latitude FROM public.profiles pr WHERE pr.id = NEW.user_id),
      (SELECT gc.lat FROM public.geocode_cache gc WHERE gc.normalized_name = lower(unaccent(coalesce(NEW.city, ''))))
    );
    sit_lng := COALESCE(
      (SELECT pr.longitude FROM public.profiles pr WHERE pr.id = NEW.user_id),
      (SELECT gc.lng FROM public.geocode_cache gc WHERE gc.normalized_name = lower(unaccent(coalesce(NEW.city, ''))))
    );

    -- affinity_score reste NULL : le score est calculé à l'envoi par le
    -- moteur unique partagé (voir send-sitter-daily-digest). Les refus
    -- déclarés du gardien (sensibilités, animaux/enfants non acceptés) sont
    -- les seuls motifs d'exclusion, appliqués par ce même moteur à l'envoi.
    INSERT INTO public.sitter_digest_queue (sitter_id, sit_id, affinity_score, distance_km)
    SELECT
      p.id,
      NEW.id,
      NULL,
      public.haversine_km(sit_lat, sit_lng, COALESCE(p.latitude, gc.lat), COALESCE(p.longitude, gc.lng))
    FROM public.profiles p
    JOIN public.sitter_profiles sp ON sp.user_id = p.id
    LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
    LEFT JOIN public.geocode_cache gc ON gc.normalized_name = lower(unaccent(coalesce(p.city, '')))
    WHERE p.role IN ('sitter', 'both')
      AND p.id <> NEW.user_id
      -- Eligibilité délivrabilité et consentement uniquement : compte actif,
      -- actif dans les 90 jours, opt-in digest, non supprimé, dans le rayon.
      -- La complétude de profil ne conditionne PAS la distribution
      -- (décision du 20/08/2026, voir commentaire d'en-tête).
      AND coalesce(p.account_status, 'active') = 'active'
      AND coalesce(p.last_seen_at, p.created_at) >= now() - interval '90 days'
      AND coalesce(ep.new_sit_digest, true) = true
      AND NOT EXISTS (
        SELECT 1 FROM public.suppressed_emails se WHERE se.email = p.email
      )
      AND (
        sit_lat IS NULL OR COALESCE(p.latitude, gc.lat) IS NULL OR
        public.haversine_km(sit_lat, sit_lng, COALESCE(p.latitude, gc.lat), COALESCE(p.longitude, gc.lng)) <= coalesce(sp.geographic_radius, 30)
      )
    ORDER BY coalesce(p.identity_verified, false) DESC
    ON CONFLICT (sitter_id, sit_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. sitter_missing_opportunities : paramètre _sitter_id réservé au rôle
-- service (digest quotidien), afin que l'email et le bloc dashboard gardien
-- soient alimentés par la MÊME fonction de calcul des manques (une seule
-- source). Un membre authentifié ne peut lire que ses propres manques.
CREATE OR REPLACE FUNCTION public.sitter_missing_opportunities(_sitter_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_target uuid := COALESCE(_sitter_id, auth.uid());
  v_sp public.sitter_profiles%ROWTYPE;
  v_total integer;
BEGIN
  -- Seul le rôle service (fonctions edge) peut viser un autre gardien.
  IF v_target IS DISTINCT FROM v_uid
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_target IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_sp FROM public.sitter_profiles WHERE user_id = v_target;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_total FROM public.sits s WHERE s.status = 'published';

  RETURN jsonb_build_object(
    'total_sits', v_total,
    'items', jsonb_build_array(
      jsonb_build_object(
        'key', 'vehicle',
        'answered', (v_sp.has_vehicle IS NOT NULL OR v_sp.has_license IS NOT NULL OR nullif(v_sp.vehicle_type, '') IS NOT NULL),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.properties pr ON pr.id = s.property_id WHERE s.status = 'published' AND pr.car_required IS TRUE)
      ),
      jsonb_build_object(
        'key', 'species',
        'answered', (coalesce(array_length(v_sp.animal_types, 1), 0) > 0),
        'concerned', (SELECT count(*) FROM public.sits s WHERE s.status = 'published' AND EXISTS (SELECT 1 FROM public.pets pt WHERE pt.property_id = s.property_id))
      ),
      jsonb_build_object(
        'key', 'work',
        'answered', (nullif(v_sp.work_during_sit, '') IS NOT NULL OR nullif(v_sp.availability_during, '') IS NOT NULL),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.owner_profiles op ON op.user_id = s.user_id WHERE s.status = 'published' AND op.presence_expected IS NOT NULL)
      ),
      jsonb_build_object(
        'key', 'sitter_type',
        'answered', (nullif(v_sp.sitter_type, '') IS NOT NULL),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.owner_profiles op ON op.user_id = s.user_id WHERE s.status = 'published' AND coalesce(array_length(op.preferred_sitter_types, 1), 0) > 0)
      ),
      jsonb_build_object(
        'key', 'pace',
        'answered', (coalesce(array_length(v_sp.lifestyle, 1), 0) > 0 OR nullif(v_sp.life_pace, '') IS NOT NULL),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.owner_profiles op ON op.user_id = s.user_id WHERE s.status = 'published' AND (op.life_pace IS NOT NULL OR coalesce(array_length(op.home_ambiance, 1), 0) > 0))
      ),
      jsonb_build_object(
        'key', 'languages',
        'answered', (coalesce(array_length(v_sp.languages, 1), 0) > 0),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.owner_profiles op ON op.user_id = s.user_id WHERE s.status = 'published' AND coalesce(array_length(op.languages, 1), 0) > 0)
      )
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.sitter_missing_opportunities(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sitter_missing_opportunities(uuid) TO service_role;