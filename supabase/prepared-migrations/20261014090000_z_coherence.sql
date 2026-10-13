-- Lot Z (14/10/2026) : cohérence des notifications, des avis, des gardes
-- réalisées et des droits.
-- Chaque fonction et politique modifiée part de sa définition relue en
-- production le 14/10/2026 (lecture seule, pg_get_functiondef, pg_policies,
-- pg_trigger). Les chiffres cités sont ceux de la base du 13/10/2026, recomptés
-- le 14/10/2026 par SELECT.
-- Fichier rejouable : CREATE OR REPLACE, DROP ... IF EXISTS, UPDATE et DELETE
-- gardés (un second passage ne touche aucune ligne). Aucun accès au coffre de
-- secrets : email_queue_dispatch ne change que de droits, son corps reste tel
-- quel.
-- Convention Y2 : tout REVOKE vise PUBLIC, anon et authenticated nommément.

-- =========================================================================
-- Z1. Notifications mortes, annonces.
-- Une annonce qui quitte l'état publié laisse des « Nouvelle annonce près de
-- chez vous » non lues qui mènent à une annonce close. 4 535 notifications
-- new_sit_nearby non lues sur 7 399 visent une annonce non publiée
-- (expired 2 892, draft 798, archived 444, cancelled 401), aucune une annonce
-- absente.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.purge_unread_new_sit_nearby_of_sit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base text;
BEGIN
  v_base := '/sits/' || NEW.id::text;
  DELETE FROM public.notifications n
   WHERE n.read_at IS NULL
     AND n.type = 'new_sit_nearby'
     AND (n.link = v_base OR n.link LIKE v_base || '?%' OR n.link LIKE v_base || '#%');
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_unread_new_sit_nearby_of_sit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_purge_new_sit_nearby_on_unpublish ON public.sits;
CREATE TRIGGER trg_purge_new_sit_nearby_on_unpublish
  AFTER UPDATE OF status ON public.sits
  FOR EACH ROW
  WHEN (OLD.status = 'published'::sit_status AND NEW.status <> 'published'::sit_status)
  EXECUTE FUNCTION public.purge_unread_new_sit_nearby_of_sit();

-- Rattrapage Z1 : 4 535 lignes au 13/10/2026. Un lien illisible compte comme
-- une annonce absente.
DELETE FROM public.notifications n
 WHERE n.type = 'new_sit_nearby'
   AND n.read_at IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.sits s
      WHERE s.id::text = substring(n.link FROM '^/sits/([0-9a-fA-F-]{36})')
        AND s.status = 'published'::sit_status
   );

-- =========================================================================
-- Z2. Notifications mortes, besoins.
-- Le relais de vague (mission_wave_relaunch) restait dans la cloche après
-- l'annulation du besoin : la branche UPDATE ne purgeait que
-- mission_help_needed. Au 13/10/2026, 99 mission_help_needed et 9
-- mission_wave_relaunch non lues visent un besoin annulé (aucune un besoin
-- terminé). Branche DELETE inchangée.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.purge_unread_notifications_of_mission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_base := '/petites-missions/' || OLD.id::text;
    DELETE FROM public.notifications n
     WHERE n.read_at IS NULL
       AND (
         n.link = v_base OR n.link LIKE v_base || '?%' OR n.link LIKE v_base || '#%'
         OR (OLD.slug IS NOT NULL AND n.link = '/projets/' || OLD.slug)
       );
    RETURN OLD;
  END IF;
  v_base := '/petites-missions/' || NEW.id::text;
  DELETE FROM public.notifications n
   WHERE n.read_at IS NULL
     AND n.type IN ('mission_help_needed', 'mission_wave_relaunch')
     AND (n.link = v_base OR n.link LIKE v_base || '?%' OR n.link LIKE v_base || '#%');
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_unread_notifications_of_mission() FROM PUBLIC, anon, authenticated;

-- Rattrapage Z2 : 108 lignes au 13/10/2026 (99 + 9).
DELETE FROM public.notifications n
 WHERE n.type IN ('mission_help_needed', 'mission_wave_relaunch')
   AND n.read_at IS NULL
   AND EXISTS (
     SELECT 1 FROM public.small_missions m
      WHERE m.id::text = substring(n.link FROM '^/petites-missions/([0-9a-fA-F-]{36})')
        AND m.status IN ('cancelled'::small_mission_status, 'completed'::small_mission_status)
   );

-- =========================================================================
-- Z3. publish_stale_reviews : la publication d'office après 14 jours visait
-- tout avis non publié, y compris un avis d'annulation (create_avis_annulation
-- les insère published = false, en_attente), un avis refusé ou masqué par
-- l'équipe. Elle ne publie plus que les avis en attente, non masqués, hors
-- annulation. Au 13/10/2026 : 8 avis, tous publiés et de type garde, la
-- fonction ne toucherait aucune ligne aujourd'hui.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.publish_stale_reviews(p_days integer DEFAULT 14)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('app.review_publisher', 'on', true);
  UPDATE public.reviews
  SET published = true, moderation_status = 'valide'
  WHERE published = false
    AND moderation_status = 'en_attente'
    AND moderation_hidden_at IS NULL
    AND review_type IS DISTINCT FROM 'annulation'
    AND created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM set_config('app.review_publisher', 'off', true);
  RETURN v_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.publish_stale_reviews(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_stale_reviews(integer) TO service_role;

-- =========================================================================
-- Z4. auto_publish_reviews : la réciprocité se déclenchait sur n'importe quel
-- autre avis de la garde, y compris un avis d'annulation ou un second avis du
-- même auteur, et publiait alors tous les avis de la garde (annulation
-- comprise). Désormais : seul un avis de garde (review_type 'garde' ou NULL,
-- défaut de la colonne 'garde', 8 avis sur 8 en base) d'un autre auteur sur
-- la même garde déclenche la publication, qui ne vise que les avis de garde en
-- attente et non masqués. Un avis d'annulation ne déclenche rien et n'est
-- jamais publié ici.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.auto_publish_reviews()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  other_review_exists BOOLEAN;
  v_sit_id UUID;
BEGIN
  v_sit_id := NEW.sit_id;

  -- Lot Z : seul un avis de garde compte, jamais un avis d'annulation ou
  -- d'entraide.
  IF v_sit_id IS NULL OR COALESCE(NEW.review_type, 'garde') <> 'garde' THEN
    RETURN NEW;
  END IF;

  -- Reciprocite : il suffit qu'un avis de garde d'un autre auteur existe sur la
  -- meme garde, quel que soit son statut de publication. Sinon un avis deja
  -- publie en forcage solo empechait definitivement la publication du second.
  SELECT EXISTS (
    SELECT 1 FROM public.reviews
    WHERE sit_id = v_sit_id
      AND id != NEW.id
      AND reviewer_id <> NEW.reviewer_id
      AND COALESCE(review_type, 'garde') = 'garde'
  ) INTO other_review_exists;

  IF other_review_exists THEN
    PERFORM set_config('app.review_publisher', 'on', true);
    UPDATE public.reviews
    SET published = true, moderation_status = 'valide'
    WHERE sit_id = v_sit_id
      AND published = false
      AND COALESCE(review_type, 'garde') = 'garde'
      AND moderation_status = 'en_attente'
      AND moderation_hidden_at IS NULL;
    PERFORM set_config('app.review_publisher', 'off', true);
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.auto_publish_reviews() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- Z5. Gardes réalisées : une seule formule pour profiles.completed_sits_count.
-- Deux formules s'écrasaient : recalculate_completed_sits (trigger sur sits,
-- annonce completed seulement, retombait à 0 à l'archivage) et
-- recalc_completed_sits_count (trigger sur reviews, avis publiés reçus). Au
-- 13/10/2026, 2 gardiens à 0 pour 1 garde réalisée (5cebd098, 995f16c2).
-- Règle retenue, celle de sit_is_reviewable : candidature du gardien
-- accepted sur une annonce completed, ou archived après être passée par
-- completed (sit_status_history). L'historique est écrit par
-- trg_track_sit_status_change_upd avant update_completed_sits_on_sit (ordre
-- alphabétique des triggers AFTER), la transition completed vers archived est
-- donc visible au recalcul.
-- recalculate_completed_sits n'ouvrait pas app.allow_internal_profile_update :
-- elle le pose, puis rend la valeur précédente.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.count_completed_sits(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COUNT(DISTINCT a.sit_id)::integer
    FROM public.applications a
   WHERE a.sitter_id = p_user_id
     AND a.status = 'accepted'
     AND public.sit_is_reviewable(a.sit_id);
$function$;

REVOKE EXECUTE ON FUNCTION public.count_completed_sits(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_completed_sits(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.recalculate_completed_sits(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_count integer;
  v_prev text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;
  v_count := public.count_completed_sits(p_user_id);
  v_prev := current_setting('app.allow_internal_profile_update', true);
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);
  UPDATE public.profiles
  SET completed_sits_count = v_count
  WHERE id = p_user_id
    AND completed_sits_count IS DISTINCT FROM v_count;
  PERFORM set_config('app.allow_internal_profile_update', COALESCE(NULLIF(v_prev, ''), 'off'), true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.recalculate_completed_sits(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_completed_sits(uuid) TO service_role;

-- Ancienne formule (avis publiés reçus) : devient un alias de la règle unique.
CREATE OR REPLACE FUNCTION public.recalc_completed_sits_count(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.recalculate_completed_sits(_user_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.recalc_completed_sits_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_completed_sits_count(uuid) TO service_role;

-- Trigger reviews_recalc_completed_sits : appelle la même fonction que
-- update_completed_sits_on_sit (trigger_update_completed_sits_on_sit appelle
-- déjà recalculate_completed_sits en production, inchangée).
CREATE OR REPLACE FUNCTION public.trg_reviews_recalc_completed_sits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_completed_sits(OLD.reviewee_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recalculate_completed_sits(NEW.reviewee_id);
    IF OLD.reviewee_id IS DISTINCT FROM NEW.reviewee_id THEN
      PERFORM public.recalculate_completed_sits(OLD.reviewee_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.recalculate_completed_sits(NEW.reviewee_id);
    RETURN NEW;
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.trg_reviews_recalc_completed_sits() FROM PUBLIC, anon, authenticated;

-- Recalcul de tous les profils : 2 lignes au 13/10/2026 (5cebd098 et
-- 995f16c2, de 0 à 1).
DO $$
BEGIN
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);
  UPDATE public.profiles p
     SET completed_sits_count = public.count_completed_sits(p.id)
   WHERE p.completed_sits_count IS DISTINCT FROM public.count_completed_sits(p.id);
  PERFORM set_config('app.allow_internal_profile_update', 'off', true);
END $$;

-- =========================================================================
-- Z6. award_badge : exécutable par tout membre connecté, sans appelant
-- (aucun appel dans src ni supabase/functions, aucun trigger, aucune
-- fonction SQL, aucun cron au 14/10/2026). Réservée au service_role.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.award_badge(text, uuid, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_badge(text, uuid, uuid, uuid, boolean) TO service_role;

-- =========================================================================
-- Z7. garde_accords.
-- accept_garde_accord et decline_garde_accord sont SECURITY DEFINER et font
-- seules les insertions (AccordDeGarde.tsx n'insère jamais en direct) : la
-- politique d'insertion directe garde_accords_sitter_insert laissait un
-- membre écrire un accord pour n'importe quelle garde. Supprimée.
-- =========================================================================
DROP POLICY IF EXISTS garde_accords_sitter_insert ON public.garde_accords;

-- create_avis_annulation : à la republication de l'annonce (gardien qui se
-- retire d'une garde à venir), l'accord signé avec l'ancien gardien et celui
-- du propriétaire sont effacés, le prochain gardien repart d'un accord vierge.
-- Au 13/10/2026 : 5 accords, aucun sur une annonce republiée.
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
  v_sit_title text;
  v_start_date date;
  v_expected_role text;
  v_expected_reviewee uuid;
BEGIN
  IF v_actor_id IS NULL OR p_reviewer_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Accès non autorisé : reviewer_id invalide';
  END IF;

  -- Lock the current relationship while authorizing and recording this cancellation.
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

  -- Lot X3a (B-02) : le gardien retenu se retire de la garde.
  IF v_actor_id = v_sitter_id THEN
    -- Sa candidature acceptée passe en cancelled, par le seul drapeau que
    -- applications_guard_status_update accepte pour accepted vers cancelled.
    PERFORM set_config('app.sitter_cancel_participation', '1', true);
    UPDATE public.applications
       SET status = 'cancelled'::application_status
     WHERE sit_id = p_sit_id
       AND sitter_id = v_sitter_id
       AND status = 'accepted'::application_status;
    PERFORM set_config('app.sitter_cancel_participation', '', true);

    -- Garde à venir : l'annonce revient en ligne pour d'autres gardiens, et
    -- le propriétaire le lit dans sa cloche (en plus de « Garde annulée »).
    -- Relecture R3 (13/10/2026) : jamais pour un propriétaire suspendu ou
    -- inactif. Sinon trg_enforce_active_account_sits (lot X3c) annulerait toute
    -- la transaction et le gardien ne pourrait plus annuler, ou, sans ce
    -- trigger, l'annonce d'un compte suspendu serait diffusée à 100 gardiens.
    -- Expression en ligne, même règle que is_account_blocked_for_actions, pour
    -- que ce fichier ne dépende pas de X3c.
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
        accepting_applications = true
      WHERE id = p_sit_id;

      -- Lot Z : l'accord de garde signé avec l'ancien gardien ne vaut pas pour
      -- le suivant, les lignes de la garde sont effacées.
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

-- =========================================================================
-- Z8. Guide de la maison : le gardien retenu lisait aussi un guide encore en
-- brouillon (published = false, 28 guides sur 38 au 13/10/2026). Le
-- propriétaire et l'équipe gardent la lecture de tout guide.
-- =========================================================================
DROP POLICY IF EXISTS sitter_view_house_guide_during_sit ON public.house_guides;
CREATE POLICY sitter_view_house_guide_during_sit ON public.house_guides
  FOR SELECT
  USING (
    (user_id = auth.uid())
    OR (
      house_guides.published = true
      AND EXISTS (
        SELECT 1
          FROM (public.sits s
            JOIN public.applications a ON ((a.sit_id = s.id)))
         WHERE ((s.property_id = house_guides.property_id)
           AND (a.sitter_id = auth.uid())
           AND (a.status = 'accepted'::application_status)
           AND (s.status = ANY (ARRAY['confirmed'::sit_status, 'in_progress'::sit_status]))
           AND (CURRENT_DATE >= (s.start_date - '7 days'::interval))
           AND (CURRENT_DATE <= s.end_date))
      )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- =========================================================================
-- Z9. email_queue_dispatch : exécutable par anon et authenticated. Appelée
-- seulement par le cron process-email-queue (armé par email_queue_wake,
-- exécuté en postgres, cron.job_run_details du 13/10/2026). Réservée au
-- service_role. Corps inchangé.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;

-- =========================================================================
-- Z10. Avis en double aveugle : le membre évalué lisait l'avis qui le
-- concerne avant sa publication (reviewee_id = auth.uid()), il pouvait donc
-- y répondre en connaissant la note. Il ne le lit plus qu'une fois publié.
-- L'auteur garde la lecture de son avis, l'équipe garde la sienne par
-- « Admins can view all reviews ». /mes-avis lit les avis reçus avec
-- published = true, LeaveReview ne lit que l'avis de l'auteur.
-- =========================================================================
DROP POLICY IF EXISTS "Published reviews are viewable by authenticated users" ON public.reviews;
CREATE POLICY "Published reviews are viewable by authenticated users" ON public.reviews
  FOR SELECT
  TO authenticated
  USING ((published = true) OR (auth.uid() = reviewer_id));

-- =========================================================================
-- Z11. Doublons à l'acceptation d'une candidature.
-- a) Le gardien recevait « Candidature acceptée » (notify_application_accepted)
--    et « Garde confirmée » (notify_sit_confirmed) dans la même transaction :
--    5 gardes sur 5 depuis le 24/07/2026, et les 7 acceptations d'avril. Seule
--    la première reste ; notify_sit_confirmed n'écrit plus au gardien qui vient
--    de recevoir application_accepted pour cette annonce (dernière minute).
--    Aucun email ni le propriétaire ne sont concernés (cette fonction n'en
--    écrit pas).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.notify_sit_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_app record;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    FOR v_app IN
      SELECT a.sitter_id FROM public.applications a
      WHERE a.sit_id = NEW.id AND a.status = 'accepted'
    LOOP
      -- Lot Z : une seule notification au gardien à l'acceptation.
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications n
         WHERE n.user_id = v_app.sitter_id
           AND n.type = 'application_accepted'
           AND n.link = '/sits/' || NEW.id
           AND n.created_at >= now() - interval '1 minute'
      ) THEN
        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (
          v_app.sitter_id,
          'sit_confirmed',
          'Garde confirmée !',
          'Votre garde « ' || coalesce(NEW.title, 'Sans titre') || ' » est maintenant confirmée.',
          '/sits/' || NEW.id
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_sit_confirmed() FROM PUBLIC, anon, authenticated;

-- b) accept_application insérait sa propre ligne sit_status_history en plus de
--    trg_track_sit_status_change_upd : deux lignes « confirmed » à la même
--    seconde pour chacune des 5 gardes acceptées par cette fonction. L'INSERT
--    manuel est retiré, le trigger reste la seule source. Lignes passées
--    conservées (journal).
CREATE OR REPLACE FUNCTION public.accept_application(p_application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sit_id uuid;
  v_owner_id uuid;
  v_current_status application_status;
  v_sit_status sit_status;
  v_auto_rejected integer := 0;
  v_rejected_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.via_accept_rpc', '1', true);

  SELECT a.sit_id, a.status, s.user_id, s.status
    INTO v_sit_id, v_current_status, v_owner_id, v_sit_status
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  WHERE a.id = p_application_id;

  IF v_sit_id IS NULL THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF v_current_status NOT IN ('pending', 'viewed', 'discussing') THEN
    RAISE EXCEPTION 'application_not_pending: %', v_current_status USING ERRCODE = '22023';
  END IF;

  IF v_sit_status IN ('confirmed', 'in_progress', 'completed', 'cancelled', 'archived') THEN
    RAISE EXCEPTION 'sit_not_open: %', v_sit_status USING ERRCODE = '22023';
  END IF;

  UPDATE applications SET status = 'accepted' WHERE id = p_application_id;

  WITH rej AS (
    UPDATE applications
       SET status = 'rejected'
     WHERE sit_id = v_sit_id
       AND id <> p_application_id
       AND status IN ('pending', 'viewed', 'discussing')
    RETURNING sitter_id
  )
  SELECT array_agg(sitter_id), count(*) INTO v_rejected_ids, v_auto_rejected FROM rej;

  v_rejected_ids := COALESCE(v_rejected_ids, ARRAY[]::uuid[]);

  -- Lot Z : l'historique de statut est écrit par trg_track_sit_status_change_upd.
  UPDATE sits
     SET status = 'confirmed',
         accepting_applications = false,
         updated_at = now()
   WHERE id = v_sit_id;

  RETURN jsonb_build_object(
    'success', true,
    'sit_id', v_sit_id,
    'accepted_application_id', p_application_id,
    'auto_rejected_count', v_auto_rejected,
    'auto_rejected_sitter_ids', to_jsonb(v_rejected_ids)
  );
END;
$function$;

-- =========================================================================
-- Z12. Données.
-- a) 3 comptes actifs de rôle sitter sans ligne sitter_profiles (créés du
--    28/04 au 03/05/2026, avant ensure_subprofiles_on_role_change). Les 8
--    comptes effacés (account_status deleted) restent sans ligne.
-- =========================================================================
INSERT INTO public.sitter_profiles (user_id)
SELECT p.id
  FROM public.profiles p
 WHERE p.role IN ('sitter', 'both')
   AND p.account_status = 'active'
   AND NOT EXISTS (SELECT 1 FROM public.sitter_profiles sp WHERE sp.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- b) FAQ « Comment devenir gardien d'urgence ? » : « dashboard » devient
--    « tableau de bord » (1 entrée sur la base).
UPDATE public.faq_entries
   SET answer = replace(answer, 'dashboard', 'tableau de bord')
 WHERE id = 'f8571b95-5542-4527-b7bb-fba63fb5bfd6'
   AND position('dashboard' IN answer) > 0;

-- =========================================================================
-- Z13. Contrôles après application (chaque requête doit renvoyer 0 ligne).
-- =========================================================================
-- Z1, new_sit_nearby non lue vers une annonce non publiée ou absente :
-- SELECT n.id FROM public.notifications n
--  WHERE n.type = 'new_sit_nearby' AND n.read_at IS NULL
--    AND NOT EXISTS (SELECT 1 FROM public.sits s
--         WHERE s.id::text = substring(n.link FROM '^/sits/([0-9a-fA-F-]{36})')
--           AND s.status = 'published');
--
-- Z2, invitation ou relance non lue vers un besoin clos :
-- SELECT n.id FROM public.notifications n
--  WHERE n.type IN ('mission_help_needed', 'mission_wave_relaunch') AND n.read_at IS NULL
--    AND EXISTS (SELECT 1 FROM public.small_missions m
--         WHERE m.id::text = substring(n.link FROM '^/petites-missions/([0-9a-fA-F-]{36})')
--           AND m.status IN ('cancelled', 'completed'));
--
-- Z3 et Z4, avis d'annulation publié :
-- SELECT id FROM public.reviews WHERE review_type = 'annulation' AND published = true;
--
-- Z5, compteur de gardes réalisées hors de la règle unique :
-- SELECT p.id FROM public.profiles p
--  WHERE p.completed_sits_count IS DISTINCT FROM public.count_completed_sits(p.id);
--
-- Z6 et Z9, fonctions encore exécutables par anon ou authenticated :
-- SELECT f FROM unnest(ARRAY[
--   'public.award_badge(text,uuid,uuid,uuid,boolean)',
--   'public.email_queue_dispatch()',
--   'public.count_completed_sits(uuid)']) f
--  WHERE has_function_privilege('anon', f, 'EXECUTE')
--     OR has_function_privilege('authenticated', f, 'EXECUTE');
--
-- Z7, politique d'insertion directe des accords :
-- SELECT policyname FROM pg_policies
--  WHERE schemaname = 'public' AND tablename = 'garde_accords' AND cmd = 'INSERT';
--
-- Z7, accord d'un ancien gardien sur une annonce republiée :
-- SELECT ga.id FROM public.garde_accords ga JOIN public.sits s ON s.id = ga.garde_id
--  WHERE s.status = 'published';
--
-- Z8, guide lisible par le gardien sans condition de publication :
-- SELECT policyname FROM pg_policies
--  WHERE schemaname = 'public' AND tablename = 'house_guides'
--    AND policyname = 'sitter_view_house_guide_during_sit' AND qual NOT LIKE '%published = true%';
--
-- Z10, avis non publié lisible par le membre évalué :
-- SELECT policyname FROM pg_policies
--  WHERE schemaname = 'public' AND tablename = 'reviews' AND cmd = 'SELECT'
--    AND 'authenticated' = ANY (roles) AND qual LIKE '%reviewee_id%';
--
-- Z11, double notification ou double historique après application :
-- SELECT n.user_id, n.link FROM public.notifications n
--  WHERE n.type IN ('application_accepted', 'sit_confirmed') AND n.created_at >= '2026-10-14'
--  GROUP BY n.user_id, n.link
-- HAVING count(DISTINCT n.type) > 1;
-- SELECT sit_id FROM public.sit_status_history
--  WHERE new_status = 'confirmed' AND changed_at >= '2026-10-14'
--  GROUP BY sit_id, changed_at HAVING count(*) > 1;
--
-- Z12, compte actif gardien sans sitter_profiles, FAQ en anglais :
-- SELECT p.id FROM public.profiles p
--  WHERE p.role IN ('sitter', 'both') AND p.account_status = 'active'
--    AND NOT EXISTS (SELECT 1 FROM public.sitter_profiles sp WHERE sp.user_id = p.id);
-- SELECT id FROM public.faq_entries WHERE answer ILIKE '%dashboard%' OR question ILIKE '%dashboard%';
