-- Lot affinité (20/08/2026) : distribution alignée sur la doctrine
-- « on trie par pertinence, on n'élimine jamais ».
-- Le déclencheur ne calcule plus de score SQL et ne filtre plus sur un
-- seuil : la file est l'éligibilité de base, le score (et le respect des
-- refus déclarés) est calculé à l'envoi par le moteur unique partagé
-- (supabase/functions/_shared/affinity/score.ts), le même que l'affichage.
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
      -- Eligibilité minimale : complétion à 60, compte actif, actif dans les 90 jours.
      AND coalesce(p.profile_completion, 0) >= 60
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

COMMENT ON FUNCTION public.notify_sitters_on_new_sit() IS
  'Remplit sitter_digest_queue à la publication d''une annonce. Ne calcule
   plus de score (20/08/2026) : le tri et le respect des refus déclarés sont
   faits à l''envoi par le moteur unique partagé _shared/affinity/score.ts.';