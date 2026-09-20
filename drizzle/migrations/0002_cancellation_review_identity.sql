-- Harden cancellation review identity without changing the RPC signature.
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
  v_expected_role text;
  v_expected_reviewee uuid;
BEGIN
  IF v_actor_id IS NULL OR p_reviewer_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Accès non autorisé : reviewer_id invalide';
  END IF;

  -- Lock the current relationship while authorizing and recording this cancellation.
  SELECT user_id INTO v_owner_id FROM public.sits WHERE id = p_sit_id FOR UPDATE;
  IF NOT FOUND OR v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Accès non autorisé : participation non vérifiée';
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

  -- ✅ Atomique — l'index unique absorbe la race condition
  INSERT INTO public.reviews (
    sit_id, reviewer_id, reviewee_id,
    review_type, cancelled_by_role, cancellation_reason,
    moderation_status, overall_rating, created_at
  ) VALUES (
    p_sit_id, p_reviewer_id, p_reviewee_id,
    'annulation', p_cancelled_by_role, p_reason,
    'en_attente', 1, now()
  )
  ON CONFLICT DO NOTHING
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