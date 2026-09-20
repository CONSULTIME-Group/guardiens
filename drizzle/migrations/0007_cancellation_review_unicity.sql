-- Lot 5 : unicite reelle des avis d'annulation.
DO $guard$
BEGIN
  IF md5(pg_get_functiondef('public.create_avis_annulation(uuid,uuid,uuid,text,text)'::regprocedure))
     <> 'd578e688447899f2e320994317b4ee07' THEN
    RAISE EXCEPTION 'Definition inattendue de create_avis_annulation, migration interrompue';
  END IF;
END
$guard$;

-- Index unique partiel : cree seulement s'il n'existe pas deja un equivalent.
-- (reviews_unique_annulation existe deja en base, verifie le 20/09/2026.)
DO $idx$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'reviews'
      AND i.indisunique
      AND pg_get_indexdef(i.indexrelid) ILIKE '%(sit_id, reviewer_id)%'
      AND pg_get_indexdef(i.indexrelid) ILIKE '%annulation%'
  ) THEN
    CREATE UNIQUE INDEX reviews_annulation_unique
      ON public.reviews (sit_id, reviewer_id)
      WHERE review_type = 'annulation';
  END IF;
END
$idx$;

CREATE OR REPLACE FUNCTION public.create_avis_annulation(p_sit_id uuid, p_reviewer_id uuid, p_reviewee_id uuid, p_cancelled_by_role text, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_review_id uuid;
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
  v_sitter_id uuid;
  v_sit_status text;
  v_expected_role text;
  v_expected_reviewee uuid;
BEGIN
  IF v_actor_id IS NULL OR p_reviewer_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Accès non autorisé : reviewer_id invalide';
  END IF;

  -- Lock the current relationship while authorizing and recording this cancellation.
  SELECT user_id, status::text INTO v_owner_id, v_sit_status
  FROM public.sits WHERE id = p_sit_id FOR UPDATE;
  IF NOT FOUND OR v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Accès non autorisé : participation non vérifiée';
  END IF;

  IF v_sit_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cette garde est déjà annulée';
  END IF;

  BEGIN
    SELECT sitter_id INTO STRICT v_sitter_id
    FROM public.applications
    WHERE sit_id = p_sit_id AND status = 'accepted'
    FOR UPDATE;
  EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN
    RAISE EXCEPTION 'Annulation impossible : gardien accepté non identifié de façon unique';
  END;

  IF v_sitter_id IS NULL OR v_sitter_id = v_owner_id THEN
    RAISE EXCEPTION 'Annulation impossible : participants invalides';
  END IF;

  IF v_actor_id = v_owner_id THEN
    v_expected_role := 'proprio';
    v_expected_reviewee := v_sitter_id;
  ELSIF v_actor_id = v_sitter_id THEN
    v_expected_role := 'gardien';
    v_expected_reviewee := v_owner_id;
  ELSE
    RAISE EXCEPTION 'Accès non autorisé : participation non vérifiée';
  END IF;

  IF p_cancelled_by_role IS DISTINCT FROM v_expected_role
     OR p_reviewee_id IS DISTINCT FROM v_expected_reviewee THEN
    RAISE EXCEPTION 'Accès non autorisé : rôle ou destinataire incohérent';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 20 THEN
    RAISE EXCEPTION 'La raison doit contenir au moins 20 caractères';
  END IF;
  IF length(p_reason) > 300 THEN
    RAISE EXCEPTION 'La raison ne peut pas dépasser 300 caractères';
  END IF;

  -- Atomique : l'index unique partiel (sit_id, reviewer_id) WHERE review_type = 'annulation'
  -- absorbe la course, la cible du ON CONFLICT le rend explicite.
  INSERT INTO public.reviews (
    sit_id, reviewer_id, reviewee_id,
    review_type, cancelled_by_role, cancellation_reason,
    moderation_status, overall_rating, created_at
  ) VALUES (
    p_sit_id, p_reviewer_id, p_reviewee_id,
    'annulation', p_cancelled_by_role, p_reason,
    'en_attente', 1, now()
  )
  ON CONFLICT (sit_id, reviewer_id) WHERE review_type = 'annulation' DO NOTHING
  RETURNING id INTO v_review_id;

  IF v_review_id IS NULL THEN
    RAISE EXCEPTION 'Avis déjà existant pour cette garde';
  END IF;

  UPDATE public.sits SET
    status = 'cancelled',
    cancelled_by = p_reviewer_id,
    cancelled_at = now()
  WHERE id = p_sit_id;

  RETURN v_review_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_avis_annulation(uuid,uuid,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_avis_annulation(uuid,uuid,uuid,text,text) TO authenticated, service_role;