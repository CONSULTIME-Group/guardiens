-- Lot E19 « Confiance avant toute parole publique » (arène entraide du
-- 25/10/2026, R3 et décision 4 validées par Jérémie : case de publication
-- décochée, accord des deux personnes pour un prénom public).
-- 1. mission_feedbacks : public_ok vaut false par défaut ; comment_moderation
--    porte le verdict de moderate-content sur le mot (ok, warning, unchecked) ;
--    un insert ou une mise à jour depuis le navigateur (rôles anon et
--    authenticated) remet public_ok à false et comment_moderation à NULL :
--    seule confirm_mission_meetup (appelée par mission-quick-action, clé de
--    service) ouvre une parole publique.
-- 2. confirm_mission_meetup, réécrite depuis sa définition de production
--    (lot X3b, prepared-migrations/20261013140100_x3b_entraide.sql) :
--    p_public_ok vaut false par défaut, p_word_moderation enregistre le
--    verdict (un mot sans verdict est « unchecked », jamais public),
--    p_outcome accepte « cancelled » : jetons consommés, besoin clos
--    (cancelled, close_reason meetup_cancelled), aucune rencontre, aucun avis,
--    aucun écusson.
-- 3. public_entraide_proofs : prénoms seulement quand les deux personnes ont
--    accepté (public_ok et oui des deux côtés), NULL sinon (repli « près de
--    {ville} » à l'écran) ; mot seulement si accepté et modéré « ok » ;
--    coordonnées arrondies à 2 décimales, comme avant.
-- 4. public_mission_feedbacks et home_social_proof : même règle pour le mot
--    (modéré « ok ») et pour le prénom (double accord).
-- Vérifié le 25/10/2026 en lecture : public_entraide_proofs 0 ligne,
-- mission_feedbacks 0 ligne. Aucune donnée à migrer. Rejouable.

DO $check$
DECLARE v_proofs int; v_feedbacks int;
BEGIN
  SELECT count(*) INTO v_proofs FROM public.public_entraide_proofs;
  SELECT count(*) INTO v_feedbacks FROM public.mission_feedbacks;
  RAISE NOTICE 'Lot E19 : % preuves publiques, % retours avant migration', v_proofs, v_feedbacks;
END;
$check$;

-- 1. mission_feedbacks
ALTER TABLE public.mission_feedbacks
  ADD COLUMN IF NOT EXISTS comment_moderation text;
ALTER TABLE public.mission_feedbacks
  ALTER COLUMN public_ok SET DEFAULT false;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'mission_feedbacks_comment_moderation_check'
       AND conrelid = 'public.mission_feedbacks'::regclass
  ) THEN
    ALTER TABLE public.mission_feedbacks
      ADD CONSTRAINT mission_feedbacks_comment_moderation_check
      CHECK (comment_moderation IS NULL OR comment_moderation IN ('ok', 'warning', 'unchecked'));
  END IF;
END;
$constraint$;

COMMENT ON COLUMN public.mission_feedbacks.comment_moderation IS
  'Lot E19 : verdict de moderate-content (type sit) sur le mot, posé par confirm_mission_meetup. Seul « ok » est publiable.';
COMMENT ON COLUMN public.mission_feedbacks.public_ok IS
  'Lot E19 : accord explicite de la personne qui répond (case décochée par défaut). Un prénom public demande l''accord des deux personnes.';

CREATE OR REPLACE FUNCTION public.guard_mission_feedback_public_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Le navigateur écrit un retour privé : la parole publique passe par
  -- confirm_mission_meetup (SECURITY DEFINER), après modération.
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.public_ok := false;
    NEW.comment_moderation := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_mission_feedback_public_fields ON public.mission_feedbacks;
CREATE TRIGGER trg_guard_mission_feedback_public_fields
  BEFORE INSERT OR UPDATE ON public.mission_feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.guard_mission_feedback_public_fields();

-- 2. confirm_mission_meetup (signature élargie : l'ancienne est retirée)
DROP FUNCTION IF EXISTS public.confirm_mission_meetup(text, text, boolean);

CREATE OR REPLACE FUNCTION public.confirm_mission_meetup(
  p_token text,
  p_word text DEFAULT NULL::text,
  p_public_ok boolean DEFAULT false,
  p_word_moderation text DEFAULT NULL::text,
  p_outcome text DEFAULT NULL::text
)
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
  v_outcome text;
  v_happened boolean;
  v_cancelled boolean;
  v_ref_date date;
  v_reopen boolean := false;
  v_badge_rows int := 0;
  v_word text;
  v_moderation text;
BEGIN
  SELECT * INTO r FROM public.mission_action_tokens WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF r.action NOT IN ('meetup_yes', 'meetup_no') THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF r.used_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_used'); END IF;
  IF r.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;

  -- Lot E19 : issue explicite, sinon celle du jeton. Les deux jetons (oui,
  -- non) appartiennent à la même personne : l'issue choisie à l'écran fait foi.
  v_outcome := COALESCE(NULLIF(btrim(COALESCE(p_outcome, '')), ''),
                        CASE WHEN r.action = 'meetup_yes' THEN 'happened' ELSE 'not_happened' END);
  IF v_outcome NOT IN ('happened', 'not_happened', 'cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  v_happened := (v_outcome = 'happened');
  v_cancelled := (v_outcome = 'cancelled');

  SELECT s.id, s.user_id, s.title, s.status, s.close_reason, s.date_needed, s.end_date INTO m
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

  -- Lot E19 : un coup de main annulé ne laisse ni rencontre ni avis.
  IF v_cancelled THEN
    UPDATE public.small_missions
       SET status = 'cancelled', closed_at = COALESCE(closed_at, now()), close_reason = 'meetup_cancelled', updated_at = now()
     WHERE id = m.id
       AND (status IN ('open', 'in_progress')
            OR (status = 'completed' AND close_reason IS NOT DISTINCT FROM 'auto_completed_after_date'));

    RETURN jsonb_build_object(
      'ok', true,
      'happened', false,
      'cancelled', true,
      'mission_id', m.id,
      'mission_title', COALESCE(m.title, ''),
      'reopened', false,
      'badge_awarded', false,
      'helper_id', v_helper_id,
      'owner_id', m.user_id,
      'actor_id', r.helper_id
    );
  END IF;

  v_word := NULLIF(btrim(COALESCE(p_word, '')), '');
  IF v_word IS NOT NULL THEN v_word := left(v_word, 140); END IF;
  -- Un mot sans verdict de moderate-content reste privé.
  v_moderation := CASE
    WHEN v_word IS NULL THEN NULL
    WHEN p_word_moderation IN ('ok', 'warning') THEN p_word_moderation
    ELSE 'unchecked'
  END;

  IF v_other IS NOT NULL THEN
    INSERT INTO public.mission_feedbacks (mission_id, giver_id, receiver_id, positive, comment, public_ok, comment_moderation)
    VALUES (r.mission_id, r.helper_id, v_other, v_happened, v_word, COALESCE(p_public_ok, false), v_moderation)
    ON CONFLICT (mission_id, giver_id) DO UPDATE
      SET positive = EXCLUDED.positive,
          comment = COALESCE(EXCLUDED.comment, public.mission_feedbacks.comment),
          comment_moderation = CASE
            WHEN EXCLUDED.comment IS NOT NULL THEN EXCLUDED.comment_moderation
            ELSE public.mission_feedbacks.comment_moderation
          END,
          public_ok = EXCLUDED.public_ok;
  END IF;

  IF v_happened THEN
    -- Lot X3b (C-10) : l'écusson vient du « oui » de l'auteur du besoin.
    IF v_helper_id IS NOT NULL AND r.helper_id = m.user_id THEN
      INSERT INTO public.badge_attributions (user_id, badge_id, giver_id, mission_id, is_manual)
      VALUES (v_helper_id, 'coup_de_main_or', m.user_id, m.id, false)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_badge_rows = ROW_COUNT;
    END IF;

    UPDATE public.small_missions
       SET status = 'completed', closed_at = COALESCE(closed_at, now()), close_reason = 'meetup_confirmed', updated_at = now()
     WHERE id = m.id
       AND status <> 'cancelled'
       AND (status <> 'completed' OR close_reason IS NOT DISTINCT FROM 'auto_completed_after_date');
  ELSIF m.status = 'cancelled' OR (m.status = 'completed' AND m.close_reason IS NOT DISTINCT FROM 'meetup_confirmed') THEN
    NULL;
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
    'cancelled', false,
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

REVOKE EXECUTE ON FUNCTION public.confirm_mission_meetup(text, text, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_mission_meetup(text, text, boolean, text, text) TO service_role;

-- 3. Preuve publique : prénoms sur double accord, mot accepté et modéré.
CREATE OR REPLACE VIEW public.public_entraide_proofs AS
SELECT
  m.id AS mission_id,
  CASE WHEN consent.both_ok THEN hp.first_name END AS helper_first_name,
  CASE WHEN consent.both_ok THEN op.first_name END AS owner_first_name,
  m.city,
  round(m.latitude::numeric, 2)::double precision AS latitude_approx,
  round(m.longitude::numeric, 2)::double precision AS longitude_approx,
  (
    SELECT left(f2.comment, 140) FROM public.mission_feedbacks f2
     WHERE f2.mission_id = m.id AND f2.positive AND f2.public_ok
       AND f2.comment_moderation = 'ok'
       AND f2.giver_id IN (m.user_id, r.responder_id)
       AND btrim(COALESCE(f2.comment, '')) <> ''
     ORDER BY f2.created_at LIMIT 1
  ) AS word,
  (
    SELECT min(f3.created_at) FROM public.mission_feedbacks f3
     WHERE f3.mission_id = m.id AND f3.positive
  ) AS happened_at
FROM public.small_missions m
JOIN public.small_mission_responses r
  ON r.mission_id = m.id AND r.status = 'accepted'
JOIN public.profiles hp ON hp.id = r.responder_id
JOIN public.profiles op ON op.id = m.user_id
CROSS JOIN LATERAL (
  SELECT (
    EXISTS (
      SELECT 1 FROM public.mission_feedbacks fh
       WHERE fh.mission_id = m.id AND fh.giver_id = r.responder_id AND fh.positive AND fh.public_ok
    )
    AND EXISTS (
      SELECT 1 FROM public.mission_feedbacks fo
       WHERE fo.mission_id = m.id AND fo.giver_id = m.user_id AND fo.positive AND fo.public_ok
    )
  ) AS both_ok
) consent
WHERE m.close_reason = 'meetup_confirmed'
  AND m.moderation_hidden_at IS NULL
  AND m.hidden_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.mission_feedbacks f
     WHERE f.mission_id = m.id AND f.positive
  );

GRANT SELECT ON public.public_entraide_proofs TO anon, authenticated;
GRANT ALL ON public.public_entraide_proofs TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_entraide_proofs FROM anon, authenticated, PUBLIC;

COMMENT ON VIEW public.public_entraide_proofs IS
  'Entraide : preuves publiques « Ça s''est passé près de chez vous ». Prénoms sur accord des deux personnes (NULL sinon, repli « près de {ville} »), ville, coordonnées arrondies à 2 décimales, mot accepté et modéré (lot E19). Lecture seule côté client.';

-- 4a. Mots sur le profil public : seul un mot modéré « ok » s'affiche.
CREATE OR REPLACE VIEW public.public_mission_feedbacks AS
SELECT id,
    receiver_id,
    positive,
    badge_key,
    CASE WHEN comment_moderation = 'ok' THEN comment END AS comment,
    created_at
   FROM public.mission_feedbacks
  WHERE public_ok IS TRUE;

GRANT SELECT ON public.public_mission_feedbacks TO anon, authenticated;
GRANT ALL ON public.public_mission_feedbacks TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_mission_feedbacks FROM anon, authenticated, PUBLIC;

-- 4b. Preuves de l'accueil : mot modéré « ok », prénom sur double accord.
CREATE OR REPLACE FUNCTION public.home_social_proof()
 RETURNS TABLE(proof_type text, first_name text, city text, proof_text text, happened_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH eligible_reviews AS (
    SELECT 'avis'::text AS proof_type, author.first_name, author.city,
      left(btrim(r.comment), 500) AS proof_text, r.created_at AS happened_at
    FROM public.reviews r
    JOIN public.profiles author ON author.id = r.reviewer_id
    WHERE r.published IS TRUE
      AND r.moderation_status = 'valide'
      AND r.moderation_hidden_at IS NULL
      AND btrim(COALESCE(r.comment, '')) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id IN (r.reviewer_id, r.reviewee_id)
          AND ur.role = 'admin'::public.app_role
      )
  ), eligible_help AS (
    SELECT 'entraide'::text AS proof_type, giver.first_name,
      COALESCE(giver.city, m.city) AS city, left(btrim(f.comment), 500) AS proof_text,
      f.created_at AS happened_at
    FROM public.mission_feedbacks f
    JOIN public.small_missions m ON m.id = f.mission_id
    JOIN public.profiles giver ON giver.id = f.giver_id
    WHERE f.positive IS TRUE AND f.public_ok IS TRUE
      AND f.comment_moderation = 'ok'
      AND btrim(COALESCE(f.comment, '')) <> ''
      AND m.close_reason = 'meetup_confirmed'
      AND m.moderation_hidden_at IS NULL AND m.hidden_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.mission_feedbacks f_other
        WHERE f_other.mission_id = f.mission_id
          AND f_other.giver_id = f.receiver_id
          AND f_other.positive IS TRUE AND f_other.public_ok IS TRUE
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id IN (f.giver_id, f.receiver_id)
          AND ur.role = 'admin'::public.app_role
      )
  )
  SELECT proof_type, first_name, city, proof_text, happened_at
  FROM (SELECT * FROM eligible_reviews UNION ALL SELECT * FROM eligible_help) proofs
  WHERE btrim(COALESCE(first_name, '')) <> '' AND happened_at IS NOT NULL
  ORDER BY happened_at DESC LIMIT 6;
$function$;

GRANT EXECUTE ON FUNCTION public.home_social_proof() TO anon, authenticated, service_role;
