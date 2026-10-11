-- Lot E2a (11/10/2026) : un coup de main réel n'est plus jamais perdu.
-- Plan : claude/plan-lots-entraide-et-notifications-push-11-octobre-2026.md.
--
-- 1. mark_mission_done : « Marquer comme terminé » (fiche du besoin et
--    messagerie). Réservé à l'auteur et à la personne retenue. Avec une
--    personne retenue, le besoin passe en « rencontre confirmée » : il compte
--    dans les coups de main donnés et ouvre l'avis. Sans personne retenue :
--    terminé par l'auteur, sans compteur. L'écusson coup_de_main_or suit la
--    même règle que le « oui » par email : attribué quand la personne retenue
--    confirme elle-même.
-- 2. confirm_mission_meetup : un « oui » donné après la clôture automatique
--    transforme cette clôture en rencontre confirmée (seules modifications,
--    dans le UPDATE de la branche « oui » : la condition WHERE, et closed_at
--    garde la date de clôture déjà posée).
-- 3. public_mission_feedbacks : seuls les avis dont la case « publier » est
--    cochée (public_ok) restent publics. La vue appartient à postgres et
--    contourne la RLS : sans filtre, tous les avis étaient lisibles.
-- 4. Rattrapage : 14 propriétaires avaient activé « Visible dans le feed
--    d'entraide » sans effet (competences_disponible seul). Leur choix est
--    reporté sur profiles.available_for_help.

CREATE OR REPLACE FUNCTION public.mark_mission_done(p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  m record;
  v_helper_id uuid;
  v_badge_rows int := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized'); END IF;

  SELECT s.id, s.user_id, s.status, s.close_reason INTO m
  FROM public.small_missions s WHERE s.id = p_mission_id FOR UPDATE;
  IF m.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT resp.responder_id INTO v_helper_id
  FROM public.small_mission_responses resp
  WHERE resp.mission_id = p_mission_id AND resp.status = 'accepted'
  ORDER BY resp.accepted_at NULLS LAST, resp.created_at LIMIT 1;

  IF v_uid <> m.user_id AND v_uid IS DISTINCT FROM v_helper_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  IF m.status = 'cancelled' THEN RETURN jsonb_build_object('ok', false, 'reason', 'cancelled'); END IF;
  IF m.status = 'completed' AND (m.close_reason IS DISTINCT FROM 'auto_completed_after_date' OR v_helper_id IS NULL) THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'counted', COALESCE(m.close_reason = 'meetup_confirmed', false));
  END IF;

  UPDATE public.small_missions
     SET status = 'completed',
         closed_at = COALESCE(closed_at, now()),
         close_reason = CASE WHEN v_helper_id IS NOT NULL THEN 'meetup_confirmed' ELSE 'completed_by_author' END,
         updated_at = now()
   WHERE id = p_mission_id;

  IF v_helper_id IS NOT NULL AND v_uid = v_helper_id THEN
    INSERT INTO public.badge_attributions (user_id, badge_id, giver_id, mission_id, is_manual)
    VALUES (v_helper_id, 'coup_de_main_or', m.user_id, m.id, false)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_badge_rows = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('ok', true, 'already', false, 'counted', v_helper_id IS NOT NULL,
    'badge_awarded', v_badge_rows > 0, 'helper_id', v_helper_id, 'owner_id', m.user_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_mission_done(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_mission_done(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirm_mission_meetup(p_token text, p_word text DEFAULT NULL::text, p_public_ok boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  m record;
  v_helper_id uuid;
  v_other uuid;
  v_happened boolean;
  v_ref_date date;
  v_reopen boolean := false;
  v_badge_rows int := 0;
  v_word text;
BEGIN
  SELECT * INTO r FROM public.mission_action_tokens WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF r.action NOT IN ('meetup_yes', 'meetup_no') THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF r.used_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_used'); END IF;
  IF r.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;

  v_happened := (r.action = 'meetup_yes');

  SELECT s.id, s.user_id, s.title, s.status, s.date_needed, s.end_date INTO m
  FROM public.small_missions s WHERE s.id = r.mission_id FOR UPDATE;
  IF m.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;

  SELECT resp.responder_id INTO v_helper_id
  FROM public.small_mission_responses resp
  WHERE resp.mission_id = r.mission_id AND resp.status = 'accepted'
  ORDER BY resp.accepted_at NULLS LAST, resp.created_at LIMIT 1;

  v_other := CASE WHEN r.helper_id = m.user_id THEN v_helper_id ELSE m.user_id END;

  UPDATE public.mission_action_tokens SET used_at = now()
   WHERE mission_id = r.mission_id AND helper_id = r.helper_id
     AND action IN ('meetup_yes', 'meetup_no') AND used_at IS NULL;

  v_word := NULLIF(btrim(COALESCE(p_word, '')), '');
  IF v_word IS NOT NULL THEN v_word := left(v_word, 140); END IF;

  IF v_other IS NOT NULL THEN
    INSERT INTO public.mission_feedbacks (mission_id, giver_id, receiver_id, positive, comment, public_ok)
    VALUES (r.mission_id, r.helper_id, v_other, v_happened, v_word, COALESCE(p_public_ok, true))
    ON CONFLICT (mission_id, giver_id) DO UPDATE
      SET positive = EXCLUDED.positive,
          comment = COALESCE(EXCLUDED.comment, public.mission_feedbacks.comment),
          public_ok = EXCLUDED.public_ok;
  END IF;

  IF v_happened THEN
    IF v_helper_id IS NOT NULL AND r.helper_id = v_helper_id THEN
      INSERT INTO public.badge_attributions (user_id, badge_id, giver_id, mission_id, is_manual)
      VALUES (v_helper_id, 'coup_de_main_or', m.user_id, m.id, false)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_badge_rows = ROW_COUNT;
    END IF;

    -- Lot E2a : une clôture automatique devient une rencontre confirmée.
    UPDATE public.small_missions
       SET status = 'completed', closed_at = COALESCE(closed_at, now()), close_reason = 'meetup_confirmed', updated_at = now()
     WHERE id = m.id
       AND (status <> 'completed' OR close_reason IS NOT DISTINCT FROM 'auto_completed_after_date');
  ELSE
    v_ref_date := COALESCE(m.end_date, m.date_needed);
    v_reopen := v_ref_date IS NOT NULL AND v_ref_date >= CURRENT_DATE;

    IF v_reopen THEN
      UPDATE public.small_missions
         SET status = 'open', updated_at = now()
       WHERE id = m.id;
    ELSE
      UPDATE public.small_missions
         SET status = 'completed', closed_at = now(), close_reason = 'meetup_not_happened', updated_at = now()
       WHERE id = m.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'happened', v_happened,
    'mission_id', m.id,
    'mission_title', COALESCE(m.title, ''),
    'reopened', v_reopen,
    'badge_awarded', (v_badge_rows > 0),
    'helper_id', v_helper_id,
    'owner_id', m.user_id,
    'actor_id', r.helper_id
  );
END;
$function$;

CREATE OR REPLACE VIEW public.public_mission_feedbacks AS
  SELECT id, receiver_id, positive, badge_key, comment, created_at
  FROM public.mission_feedbacks
  WHERE public_ok IS TRUE;

DO $migration$
DECLARE v_count int;
BEGIN
  CREATE TABLE IF NOT EXISTS public._backup_owner_help_e2a_20261011 AS
    SELECT p.id, p.available_for_help
    FROM public.profiles p
    JOIN public.owner_profiles op ON op.user_id = p.id
    WHERE COALESCE(op.competences_disponible, false)
      AND NOT COALESCE(p.available_for_help, false);
  ALTER TABLE public._backup_owner_help_e2a_20261011 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_owner_help_e2a_20261011 FROM PUBLIC, anon, authenticated;

  UPDATE public.profiles p
     SET available_for_help = true
    FROM public._backup_owner_help_e2a_20261011 b
   WHERE p.id = b.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 50 THEN RAISE EXCEPTION 'Rattrapage inattendu : % profils', v_count; END IF;
END;
$migration$;
