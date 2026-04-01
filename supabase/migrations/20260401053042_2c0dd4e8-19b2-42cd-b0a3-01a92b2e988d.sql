
-- ÉTAPE 1 & 2 & 3: Nouvelles colonnes sur reviews
-- review_type existe déjà, on met un default et on ajoute les nouvelles colonnes

ALTER TABLE public.reviews
ALTER COLUMN review_type SET DEFAULT 'garde';

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS cancelled_by_role text;

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS cancellation_response text;

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS response_status text DEFAULT 'aucune';

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS response_submitted_at timestamptz;

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'en_attente';

-- Validation trigger for review_type
CREATE OR REPLACE FUNCTION public.validate_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate review_type
  IF NEW.review_type IS NOT NULL AND NEW.review_type NOT IN ('garde', 'mission', 'annulation') THEN
    RAISE EXCEPTION 'Type d''avis invalide: %. Valeurs acceptées: garde, mission, annulation', NEW.review_type;
  END IF;

  -- Validate cancelled_by_role
  IF NEW.cancelled_by_role IS NOT NULL AND NEW.cancelled_by_role NOT IN ('proprio', 'gardien', 'admin') THEN
    RAISE EXCEPTION 'Valeur cancelled_by_role invalide: %', NEW.cancelled_by_role;
  END IF;

  -- Validate cancellation_reason for annulation type
  IF NEW.review_type = 'annulation' THEN
    IF NEW.cancellation_reason IS NULL OR length(NEW.cancellation_reason) < 20 OR length(NEW.cancellation_reason) > 300 THEN
      RAISE EXCEPTION 'La raison d''annulation doit contenir entre 20 et 300 caractères';
    END IF;
  END IF;

  -- Validate cancellation_response length
  IF NEW.cancellation_response IS NOT NULL AND length(NEW.cancellation_response) > 300 THEN
    RAISE EXCEPTION 'La réponse ne peut pas dépasser 300 caractères';
  END IF;

  -- Validate response_status
  IF NEW.response_status IS NOT NULL AND NEW.response_status NOT IN ('aucune', 'en_attente', 'validee', 'refusee') THEN
    RAISE EXCEPTION 'Statut de réponse invalide: %', NEW.response_status;
  END IF;

  -- Validate moderation_status
  IF NEW.moderation_status NOT IN ('en_attente', 'valide', 'refuse') THEN
    RAISE EXCEPTION 'Statut de modération invalide: %', NEW.moderation_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_review_fields ON public.reviews;
CREATE TRIGGER trg_validate_review_fields
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review_fields();

-- Existing garde/mission reviews → moderation 'valide'
UPDATE public.reviews
SET moderation_status = 'valide'
WHERE review_type IN ('garde', 'mission') OR review_type IS NULL;

-- ÉTAPE 4: Vue publique des avis
CREATE OR REPLACE VIEW public.avis_publics AS
SELECT
  r.*,
  p_auteur.first_name as auteur_nom,
  p_auteur.avatar_url as auteur_avatar,
  p_cible.first_name as cible_nom
FROM public.reviews r
JOIN public.profiles p_auteur ON p_auteur.id = r.reviewer_id
JOIN public.profiles p_cible ON p_cible.id = r.reviewee_id
WHERE r.moderation_status = 'valide';

-- ÉTAPE 5: Fonction création avis annulation
CREATE OR REPLACE FUNCTION public.create_avis_annulation(
  p_sit_id uuid,
  p_reviewer_id uuid,
  p_reviewee_id uuid,
  p_cancelled_by_role text,
  p_reason text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_review_id uuid;
BEGIN
  IF length(p_reason) < 20 THEN
    RAISE EXCEPTION 'La raison doit contenir au moins 20 caractères';
  END IF;
  IF length(p_reason) > 300 THEN
    RAISE EXCEPTION 'La raison ne peut pas dépasser 300 caractères';
  END IF;

  INSERT INTO public.reviews (
    sit_id, reviewer_id, reviewee_id,
    review_type, cancelled_by_role, cancellation_reason,
    moderation_status, overall_rating, created_at
  ) VALUES (
    p_sit_id, p_reviewer_id, p_reviewee_id,
    'annulation', p_cancelled_by_role, p_reason,
    'en_attente', 1, now()
  )
  RETURNING id INTO v_review_id;

  UPDATE public.sits SET
    status = 'cancelled',
    cancelled_by = p_reviewer_id,
    cancelled_at = now()
  WHERE id = p_sit_id;

  RETURN v_review_id;
END;
$$;

-- ÉTAPE 6: Fonction réponse à l'avis annulation
CREATE OR REPLACE FUNCTION public.repondre_avis_annulation(
  p_review_id uuid,
  p_respondent_id uuid,
  p_response text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_review public.reviews%ROWTYPE;
BEGIN
  SELECT * INTO v_review FROM public.reviews WHERE id = p_review_id;

  IF v_review.review_type != 'annulation' THEN
    RAISE EXCEPTION 'Cet avis ne supporte pas de réponse';
  END IF;
  IF v_review.moderation_status != 'valide' THEN
    RAISE EXCEPTION 'L''avis doit être validé avant de pouvoir répondre';
  END IF;
  IF v_review.reviewee_id != p_respondent_id THEN
    RAISE EXCEPTION 'Seule la partie concernée peut répondre';
  END IF;
  IF v_review.response_status != 'aucune' THEN
    RAISE EXCEPTION 'Une réponse existe déjà';
  END IF;
  IF now() > v_review.created_at + interval '7 days' THEN
    RAISE EXCEPTION 'Le délai de réponse de 7 jours est dépassé';
  END IF;
  IF length(p_response) > 300 THEN
    RAISE EXCEPTION 'La réponse ne peut pas dépasser 300 caractères';
  END IF;

  UPDATE public.reviews SET
    cancellation_response = p_response,
    response_status = 'en_attente',
    response_submitted_at = now()
  WHERE id = p_review_id;
END;
$$;

-- ÉTAPE 7: RLS - avis annulation en attente visibles par admin + parties
CREATE POLICY "Anon can view published reviews"
ON public.reviews
FOR SELECT
TO anon
USING (
  moderation_status = 'valide'
  AND (review_type IS NULL OR review_type != 'annulation' OR published = true)
);

-- ÉTAPE 8: Index
CREATE INDEX IF NOT EXISTS idx_reviews_review_type ON public.reviews (review_type);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON public.reviews (moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_type_moderation ON public.reviews (reviewee_id, review_type, moderation_status);
