-- Lot REC4 (22/11/2026, recette complete du 22/11, defauts P2-2 et P2-3,
-- « ok go tout » de Jeremie). Repere : rec4_gardes_coherence.
--
-- 1. Annonce remise en ligne apres l'annulation du gardien (P2-2).
--    create_avis_annulation republiait l'annonce en gardant cancelled_by et
--    cancelled_at : une annonce publiee portait l'auteur et la date d'une
--    annulation. La remise en ligne les efface. Corps repris de
--    pg_get_functiondef du 22/11/2026, seule cette ecriture change.
--    Le compteur d'annulations du gardien se lisait sur les annonces encore
--    annulees : il perdait chaque annonce remise en ligne au recalcul
--    suivant. recalculate_cancellations le lit desormais sur les avis
--    d'annulation du gardien, qui restent. Le compteur du proprietaire ne
--    change pas.
-- 2. Dates passees (P2-3). La base acceptait la publication d'une annonce
--    dont la fin est passee, et le deplacement d'une annonce publiee dans le
--    passe (le site filtre, la base non). guard_sit_publish_dates_a_venir
--    refuse ces deux ecritures aux membres. Une annonce deja publiee dont la
--    fin vient de passer reste modifiable sur ses autres champs, l'equipe et
--    les taches du serveur ne sont pas concernees.
-- Aucune donnee modifiee. Rejouable.

CREATE OR REPLACE FUNCTION public.create_avis_annulation(p_sit_id uuid, p_reviewer_id uuid, p_reviewee_id uuid, p_cancelled_by_role text, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- rec4_gardes_coherence : la remise en ligne efface l'auteur et la date de l'annulation.
DECLARE
  v_review_id uuid;
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
  v_sitter_id uuid;
  v_sit_status text;
  v_sit_title text;
  v_start_date date;
  v_expected_role text;
  v_expected_reviewee uuid;
BEGIN
  IF v_actor_id IS NULL OR p_reviewer_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Accès non autorisé : reviewer_id invalide';
  END IF;
  SELECT user_id, status::text, title, start_date
    INTO v_owner_id, v_sit_status, v_sit_title, v_start_date
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
  IF v_actor_id = v_sitter_id THEN
    PERFORM set_config('app.sitter_cancel_participation', '1', true);
    UPDATE public.applications
       SET status = 'cancelled'::application_status
     WHERE sit_id = p_sit_id
       AND sitter_id = v_sitter_id
       AND status = 'accepted'::application_status;
    PERFORM set_config('app.sitter_cancel_participation', '', true);
    IF v_start_date IS NOT NULL AND v_start_date > current_date
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles p
          WHERE p.id = v_owner_id
            AND (coalesce(p.account_status, 'active') <> 'active'
                 OR (p.suspended_at IS NOT NULL
                     AND (p.suspended_until IS NULL OR p.suspended_until > now())))
       ) THEN
      UPDATE public.sits SET
        status = 'published',
        accepting_applications = true,
        cancelled_by = NULL,
        cancelled_at = NULL
      WHERE id = p_sit_id;
      DELETE FROM public.garde_accords WHERE garde_id = p_sit_id;
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_owner_id,
        'sit_republished',
        'Annonce de nouveau en ligne',
        'Votre annonce « ' || coalesce(v_sit_title, 'votre garde') || ' » est de nouveau ouverte aux candidatures.',
        '/sits/' || p_sit_id
      );
    END IF;
  END IF;
  RETURN v_review_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_cancellations(p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- annul1_annulation_garde : ecriture interne du compteur autorisee.
-- rec4_gardes_coherence : le compteur du gardien se lit sur ses avis
-- d'annulation, qui restent quand l'annonce est remise en ligne.
BEGIN
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);
  IF p_role = 'gardien' THEN
    UPDATE profiles
    SET cancellation_count = (
      SELECT COUNT(*) FROM reviews r
      WHERE r.reviewer_id = p_user_id
        AND r.review_type = 'annulation'
        AND r.cancelled_by_role = 'gardien'
    )
    WHERE id = p_user_id;
  ELSIF p_role = 'proprio' THEN
    UPDATE profiles
    SET cancellations_as_proprio = (
      SELECT COUNT(*) FROM sits
      WHERE user_id = p_user_id
        AND status = 'cancelled'
        AND cancelled_by = p_user_id
    )
    WHERE id = p_user_id;
  END IF;
  PERFORM set_config('app.allow_internal_profile_update', 'off', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_sit_publish_dates_a_venir()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
-- rec4_gardes_coherence
BEGIN
  IF NEW.status IS DISTINCT FROM 'published'::sit_status OR NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.end_date >= current_date THEN
    RETURN NEW;
  END IF;
  -- Annonce déjà publiée dont la fin vient de passer : ses autres champs
  -- restent modifiables jusqu'à son expiration.
  IF TG_OP = 'UPDATE'
     AND OLD.status IS NOT DISTINCT FROM 'published'::sit_status
     AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date THEN
    RETURN NEW;
  END IF;
  -- L'équipe et les tâches du serveur ne sont pas concernées.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Les dates de cette annonce sont passées. Choisissez de nouvelles dates pour la publier.'
    USING ERRCODE = 'P0001', HINT = 'sit_dates_past';
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_sit_publish_dates_a_venir ON public.sits;
CREATE TRIGGER trg_guard_sit_publish_dates_a_venir
  BEFORE INSERT OR UPDATE OF status, end_date ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.guard_sit_publish_dates_a_venir();
