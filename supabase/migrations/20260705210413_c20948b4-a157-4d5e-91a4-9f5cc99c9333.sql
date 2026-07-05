
-- =============================================================================
-- Pass 1 nurturing gardiens : socle backend digest quotidien
-- =============================================================================

-- 1) Colonne opt-in sur email_preferences ---------------------------------------
ALTER TABLE public.email_preferences
  ADD COLUMN IF NOT EXISTS new_sit_digest boolean NOT NULL DEFAULT true;

-- 2) Table sitter_digest_queue --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sitter_digest_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sitter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sit_id uuid NOT NULL REFERENCES public.sits(id) ON DELETE CASCADE,
  affinity_score integer,
  distance_km numeric(6, 2),
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'skipped')),
  skip_reason text,
  UNIQUE (sitter_id, sit_id)
);

CREATE INDEX IF NOT EXISTS idx_sitter_digest_queue_sitter_status
  ON public.sitter_digest_queue(sitter_id, status);
CREATE INDEX IF NOT EXISTS idx_sitter_digest_queue_status_queued
  ON public.sitter_digest_queue(status, queued_at) WHERE status = 'queued';

GRANT SELECT ON public.sitter_digest_queue TO authenticated;
GRANT ALL ON public.sitter_digest_queue TO service_role;

ALTER TABLE public.sitter_digest_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sitters can read own queue" ON public.sitter_digest_queue;
CREATE POLICY "Sitters can read own queue"
  ON public.sitter_digest_queue FOR SELECT
  TO authenticated
  USING (sitter_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all digest queue" ON public.sitter_digest_queue;
CREATE POLICY "Admins can read all digest queue"
  ON public.sitter_digest_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) Haversine helper -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians((lat2 - lat1) / 2)), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians((lng2 - lng1) / 2)), 2)
  ));
$$;

-- 4) Fonction affinity score (version PG simplifiée, dénominateur adaptatif) ----
-- Retourne un integer 0-100 basé sur 5 critères comparables, ou NULL si < 3
-- critères sont exploitables. Reproduit une portion de la logique frontend
-- computeAffinityScore. Version détaillée à venir en Pass 2.
CREATE OR REPLACE FUNCTION public.calculate_affinity_score_pg(
  owner_id uuid,
  sitter_id uuid
) RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_pref RECORD;
  v_sitter RECORD;
  v_owner_pets_species text[];
  v_matched integer := 0;
  v_denom integer := 0;
  v_score integer := 0;
BEGIN
  -- Sitter profile
  SELECT sp.*, p.city AS sitter_city, p.postal_code AS sitter_postal
  INTO v_sitter
  FROM public.sitter_profiles sp
  JOIN public.profiles p ON p.id = sp.user_id
  WHERE sp.user_id = sitter_id
  LIMIT 1;

  IF v_sitter IS NULL THEN
    RETURN NULL;
  END IF;

  -- Owner preferences (peut ne pas exister)
  SELECT * INTO v_owner_pref
  FROM public.owner_profiles
  WHERE user_id = owner_id
  LIMIT 1;

  -- Pets species aggregés
  SELECT array_agg(DISTINCT pt.species::text)
  INTO v_owner_pets_species
  FROM public.properties pr
  JOIN public.pets pt ON pt.property_id = pr.id
  WHERE pr.user_id = owner_id;

  -- Critère 1 : types d'animaux
  IF v_owner_pets_species IS NOT NULL AND v_sitter.animal_types IS NOT NULL THEN
    v_denom := v_denom + 1;
    IF v_sitter.animal_types && v_owner_pets_species THEN
      v_matched := v_matched + 1;
    END IF;
  END IF;

  -- Critère 2 : expérience requise vs déclarée
  IF v_owner_pref.experience_required IS NOT NULL AND v_sitter.experience_years IS NOT NULL THEN
    v_denom := v_denom + 1;
    IF v_owner_pref.experience_required = false
       OR v_sitter.experience_years IN ('1-3', '3-5', '5+', '3', '5', '10+')
    THEN
      v_matched := v_matched + 1;
    END IF;
  END IF;

  -- Critère 3 : préférence rencontre
  IF v_owner_pref.meeting_preference IS NOT NULL
     AND v_sitter.meeting_preference IS NOT NULL
     AND array_length(v_owner_pref.meeting_preference, 1) > 0
     AND array_length(v_sitter.meeting_preference, 1) > 0
  THEN
    v_denom := v_denom + 1;
    IF v_owner_pref.meeting_preference && v_sitter.meeting_preference THEN
      v_matched := v_matched + 1;
    END IF;
  END IF;

  -- Critère 4 : handover
  IF v_owner_pref.handover_preference IS NOT NULL
     AND v_sitter.handover_preference IS NOT NULL
  THEN
    v_denom := v_denom + 1;
    IF v_owner_pref.handover_preference = v_sitter.handover_preference THEN
      v_matched := v_matched + 1;
    END IF;
  END IF;

  -- Critère 5 : lifestyle (rythme, ambiances)
  IF v_owner_pref.life_pace IS NOT NULL AND v_sitter.lifestyle IS NOT NULL
     AND array_length(v_sitter.lifestyle, 1) > 0
  THEN
    v_denom := v_denom + 1;
    IF v_sitter.lifestyle @> ARRAY[v_owner_pref.life_pace]::text[] THEN
      v_matched := v_matched + 1;
    END IF;
  END IF;

  IF v_denom < 3 THEN
    RETURN NULL;
  END IF;

  v_score := round((v_matched::numeric / v_denom::numeric) * 100);
  RETURN v_score;
END;
$$;

-- 5) Trigger notify_sitters_on_new_sit -----------------------------------------
CREATE OR REPLACE FUNCTION public.notify_sitters_on_new_sit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_should_run boolean := false;
  v_sit_lat double precision;
  v_sit_lng double precision;
BEGIN
  -- Ne s'active qu'au passage en 'published' + accepting_applications
  IF NEW.status = 'published'
     AND NEW.accepting_applications = true
     AND NEW.unpublished_at IS NULL
  THEN
    IF TG_OP = 'INSERT' THEN
      v_should_run := true;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.status IS DISTINCT FROM NEW.status
         OR OLD.accepting_applications IS DISTINCT FROM NEW.accepting_applications
         OR OLD.unpublished_at IS DISTINCT FROM NEW.unpublished_at
      THEN
        v_should_run := true;
      END IF;
    END IF;
  END IF;

  IF NOT v_should_run THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- Coordonnées annonce
    SELECT lat, lng INTO v_sit_lat, v_sit_lng
    FROM public.geocode_cache
    WHERE normalized_name = lower(unaccent(coalesce(NEW.city, '')))
    LIMIT 1;

    -- Enqueue gardiens éligibles
    INSERT INTO public.sitter_digest_queue (
      sitter_id, sit_id, affinity_score, distance_km, status
    )
    SELECT
      p.id,
      NEW.id,
      public.calculate_affinity_score_pg(NEW.user_id, p.id),
      CASE
        WHEN v_sit_lat IS NOT NULL AND gc.lat IS NOT NULL
        THEN round(public.haversine_km(v_sit_lat, v_sit_lng, gc.lat, gc.lng)::numeric, 2)
        ELSE NULL
      END,
      'queued'
    FROM public.profiles p
    JOIN public.sitter_profiles sp ON sp.user_id = p.id
    LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
    LEFT JOIN public.geocode_cache gc
      ON gc.normalized_name = lower(unaccent(coalesce(p.city, '')))
    WHERE p.id <> NEW.user_id
      AND p.role IN ('sitter', 'both')
      AND coalesce(p.profile_completion, 0) >= 60
      AND coalesce(p.identity_verified, false) = true
      AND coalesce(p.account_status, 'active') = 'active'
      AND coalesce(p.last_seen_at, p.created_at) >= now() - interval '90 days'
      AND coalesce(ep.new_sit_digest, true) = true
      AND NOT EXISTS (
        SELECT 1 FROM public.suppressed_emails se
        WHERE se.email = p.email
      )
      -- distance : autorisée si radius null (défaut 30) ou géocodage manquant
      AND (
        v_sit_lat IS NULL OR gc.lat IS NULL OR
        public.haversine_km(v_sit_lat, v_sit_lng, gc.lat, gc.lng)
          <= coalesce(sp.geographic_radius, 30)
      )
      -- score d'affinité ≥ 40 (ou NULL toléré, l'edge function affinera)
      AND (
        public.calculate_affinity_score_pg(NEW.user_id, p.id) IS NULL
        OR public.calculate_affinity_score_pg(NEW.user_id, p.id) >= 40
      )
    ON CONFLICT (sitter_id, sit_id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    -- Ne jamais bloquer la publication : log warning et continuer
    RAISE WARNING 'notify_sitters_on_new_sit failed for sit %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_sitters_on_new_sit ON public.sits;
CREATE TRIGGER trg_notify_sitters_on_new_sit
  AFTER INSERT OR UPDATE OF status, accepting_applications, unpublished_at
  ON public.sits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sitters_on_new_sit();

-- =============================================================================
-- Test SQL manuel (à exécuter après migration, ne fait pas partie de la migration) :
-- SELECT public.calculate_affinity_score_pg('<owner_uuid>', '<sitter_uuid>');
-- UPDATE public.sits SET status='published', accepting_applications=true WHERE id='<sit_uuid>';
-- SELECT * FROM public.sitter_digest_queue WHERE sit_id='<sit_uuid>';
-- =============================================================================
