-- Lot ANNUL1 (21/11/2026, message de contact de Sophie du 21/11, « oui vas y »
-- de Jeremie). Repere : annul1_annulation_garde.
--
-- Constat du 21/11/2026 : aucun proprietaire ne peut annuler une garde
-- confirmee. create_avis_annulation passe la garde a cancelled, le declencheur
-- notify_sit_cancelled ecrit profiles.cancellation_count sans poser
-- app.allow_internal_profile_update, et prevent_profile_sensitive_self_update
-- leve « Modification interdite d'un champ sensible du profil » : toute
-- l'annulation est defaite. Reproduit en production dans une transaction
-- annulee (compte de Sophie, garde de Santeny). Sur les 5 gardes annulees en
-- base, aucune ne l'a ete par son proprietaire. Le chemin du gardien passait
-- par le meme declencheur.
-- recalculate_cancellations comparait cancelled_by (uuid) a 'gardien' et
-- 'proprio' (texte) : erreur de conversion une fois le premier blocage leve.
--
-- 1. notify_sit_cancelled : corps repris de pg_get_functiondef du 21/11/2026,
--    seule l'ecriture du compteur est encadree par le drapeau interne.
-- 2. recalculate_cancellations : auteur lu par uuid, drapeau interne pose.
-- Memes signatures, SECURITY DEFINER et search_path inchanges, droits laisses
-- a CREATE OR REPLACE. Aucune donnee modifiee. Rejouable.
--
-- Essai en production le 21/11/2026, transaction annulee : annulation par la
-- proprietaire OK, statut cancelled, gardienne notifiee, compteurs a 1.

CREATE OR REPLACE FUNCTION public.notify_sit_cancelled()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- annul1_annulation_garde : ecriture interne du compteur autorisee.
DECLARE
  v_canceller_name text;
  v_canceller_avatar text;
  v_app record;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.cancelled_by IS NOT NULL THEN
    SELECT p.first_name, p.avatar_url INTO v_canceller_name, v_canceller_avatar
    FROM public.profiles p WHERE p.id = NEW.cancelled_by;

    PERFORM set_config('app.allow_internal_profile_update', 'on', true);
    UPDATE public.profiles SET cancellation_count = cancellation_count + 1 WHERE id = NEW.cancelled_by;
    PERFORM set_config('app.allow_internal_profile_update', 'off', true);

    IF NEW.cancelled_by = NEW.user_id THEN
      FOR v_app IN
        SELECT a.sitter_id FROM public.applications a
        WHERE a.sit_id = NEW.id AND a.status = 'accepted'
      LOOP
        INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
        VALUES (
          v_app.sitter_id, 'sit_cancelled',
          'Garde annulée',
          coalesce(v_canceller_name, 'Le propriétaire') || ' a annulé la garde « ' || coalesce(NEW.title, '') || ' ».',
          '/sits/' || NEW.id, v_canceller_name, v_canceller_avatar
        );
      END LOOP;
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
      VALUES (
        NEW.user_id, 'sit_cancelled',
        'Garde annulée',
        coalesce(v_canceller_name, 'Le gardien') || ' a annulé la garde « ' || coalesce(NEW.title, '') || ' ».',
        '/sits/' || NEW.id, v_canceller_name, v_canceller_avatar
      );
    END IF;

    IF (SELECT cancellation_count FROM public.profiles WHERE id = NEW.cancelled_by) >= 3 THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.cancelled_by, 'info',
        'Un petit mot...',
        'On a remarqué plusieurs annulations récentes. Tout va bien ? Si vous avez besoin d''aide, on est là.',
        '/settings'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_cancellations(p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
-- annul1_annulation_garde : auteur lu par uuid (cancelled_by est un uuid),
-- ecriture interne du compteur autorisee.
BEGIN
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);
  IF p_role = 'gardien' THEN
    UPDATE profiles
    SET cancellation_count = (
      SELECT COUNT(*) FROM sits s
      JOIN applications a ON a.sit_id = s.id AND a.sitter_id = p_user_id
      WHERE s.status = 'cancelled'
        AND s.cancelled_by = p_user_id
        AND s.user_id <> p_user_id
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
