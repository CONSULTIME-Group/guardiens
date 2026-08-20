-- 1. Isolation du seuil de complétion du digest dans une constante nommée.
-- CRITÈRE DE QUALITÉ D'ENVOI, PAS D'AFFINITÉ (arbitrage Jérémie en cours, 20/08/2026) :
-- écarte aujourd'hui 536/987 gardiens (complétion moyenne 29 % chez les écartés,
-- dont 260 joignables : actifs, vus depuis moins de 90 jours, opt-in email).
-- Basculable en une ligne, aucune autre logique modifiée.
CREATE OR REPLACE FUNCTION public.notify_sitters_on_new_sit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  DIGEST_MIN_PROFILE_COMPLETION CONSTANT integer := 60; -- voir note ci-dessus
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
      -- Eligibilité minimale : complétion (constante documentée ci-dessus), compte actif, actif dans les 90 jours.
      AND coalesce(p.profile_completion, 0) >= DIGEST_MIN_PROFILE_COMPLETION
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

-- 2. Sauvegarde figée des dix booléens avant conversion tri-état.
-- Table interne : aucun accès application (pas de grant anon/authenticated).
CREATE TABLE public._backup_sitter_booleans_20260820 AS
SELECT
  user_id,
  has_vehicle,
  has_license,
  smoker,
  farm_animals_ok,
  demanding_breeds_ok,
  strict_rules_ok,
  indoor_cats_only,
  prefer_visitors,
  travels_with_children,
  travels_with_own_animals
FROM public.sitter_profiles;
GRANT ALL ON public._backup_sitter_booleans_20260820 TO service_role;

-- 3. Passage tri-état : NULL = jamais répondu. false hérité du défaut redevient NULL,
-- true reste true, les nouveaux profils naissent sans réponse (DEFAULT NULL).
ALTER TABLE public.sitter_profiles ALTER COLUMN demanding_breeds_ok DROP NOT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN indoor_cats_only DROP NOT NULL;

ALTER TABLE public.sitter_profiles ALTER COLUMN has_vehicle SET DEFAULT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN has_license SET DEFAULT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN smoker SET DEFAULT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN farm_animals_ok SET DEFAULT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN demanding_breeds_ok SET DEFAULT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN strict_rules_ok SET DEFAULT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN indoor_cats_only SET DEFAULT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN prefer_visitors SET DEFAULT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN travels_with_children SET DEFAULT NULL;
ALTER TABLE public.sitter_profiles ALTER COLUMN travels_with_own_animals SET DEFAULT NULL;

UPDATE public.sitter_profiles SET has_vehicle = NULL WHERE has_vehicle = false;
UPDATE public.sitter_profiles SET has_license = NULL WHERE has_license = false;
UPDATE public.sitter_profiles SET smoker = NULL WHERE smoker = false;
UPDATE public.sitter_profiles SET farm_animals_ok = NULL WHERE farm_animals_ok = false;
UPDATE public.sitter_profiles SET demanding_breeds_ok = NULL WHERE demanding_breeds_ok = false;
UPDATE public.sitter_profiles SET strict_rules_ok = NULL WHERE strict_rules_ok = false;
UPDATE public.sitter_profiles SET indoor_cats_only = NULL WHERE indoor_cats_only = false;
UPDATE public.sitter_profiles SET prefer_visitors = NULL WHERE prefer_visitors = false;
UPDATE public.sitter_profiles SET travels_with_children = NULL WHERE travels_with_children = false;
UPDATE public.sitter_profiles SET travels_with_own_animals = NULL WHERE travels_with_own_animals = false;

COMMENT ON TABLE public._backup_sitter_booleans_20260820 IS 'Sauvegarde figée des dix booléens de sitter_profiles avant le passage tri-état du 20/08/2026. Restauration manuelle uniquement, jamais lue par l application.';