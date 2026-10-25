-- Lot E19 : recette SQL de la migration 0100 sur une base PostgreSQL vide.
-- Schéma minimal (colonnes lues par la migration), puis migration, puis
-- scénarios. Toute assertion fausse lève une exception.
-- Usage : psql -v ON_ERROR_STOP=1 -d <base vide> -f src/__tests__/e19/recette-e19.sql
-- (depuis la racine du dépôt). Jamais contre la production.

\set ON_ERROR_STOP 1

CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END $$;

CREATE TYPE public.small_mission_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.small_mission_response_status AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (id uuid PRIMARY KEY, first_name text, city text);
CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reviewer_id uuid, reviewee_id uuid, comment text,
  published boolean, moderation_status text, moderation_hidden_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.small_missions (
  id uuid PRIMARY KEY, user_id uuid, title text, city text,
  latitude numeric, longitude numeric,
  status public.small_mission_status, close_reason text, closed_at timestamptz,
  date_needed date, end_date date, updated_at timestamptz,
  moderation_hidden_at timestamptz, hidden_at timestamptz
);
CREATE TABLE public.small_mission_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mission_id uuid, responder_id uuid,
  status public.small_mission_response_status, accepted_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.mission_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mission_id uuid NOT NULL, helper_id uuid NOT NULL,
  action text NOT NULL, token text NOT NULL UNIQUE, created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days', used_at timestamptz
);
CREATE TABLE public.mission_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mission_id uuid NOT NULL, giver_id uuid NOT NULL,
  receiver_id uuid NOT NULL, positive boolean NOT NULL, badge_key text, comment text,
  created_at timestamptz NOT NULL DEFAULT now(), public_ok boolean NOT NULL DEFAULT true,
  UNIQUE (mission_id, giver_id)
);
CREATE TABLE public.badge_attributions (
  user_id uuid, badge_id text, giver_id uuid, mission_id uuid, is_manual boolean,
  UNIQUE (user_id, badge_id, mission_id)
);
GRANT SELECT, INSERT, UPDATE ON public.mission_feedbacks TO authenticated;
-- Objets existants avant E19 (signature et colonnes de production).
CREATE FUNCTION public.confirm_mission_meetup(p_token text, p_word text DEFAULT NULL, p_public_ok boolean DEFAULT true)
  RETURNS jsonb LANGUAGE sql AS $f$ SELECT '{}'::jsonb $f$;
CREATE VIEW public.public_entraide_proofs AS
SELECT m.id AS mission_id, hp.first_name AS helper_first_name, op.first_name AS owner_first_name, m.city,
  round(m.latitude, 2)::double precision AS latitude_approx, round(m.longitude, 2)::double precision AS longitude_approx,
  NULL::text AS word, NULL::timestamptz AS happened_at
FROM public.small_missions m
JOIN public.small_mission_responses r ON r.mission_id = m.id AND r.status = 'accepted'
JOIN public.profiles hp ON hp.id = r.responder_id
JOIN public.profiles op ON op.id = m.user_id
WHERE false;
CREATE VIEW public.public_mission_feedbacks AS
SELECT id, receiver_id, positive, badge_key, comment, created_at FROM public.mission_feedbacks WHERE public_ok IS TRUE;

\i drizzle/migrations/0100_e19_confiance_parole_publique.sql
-- Rejouable.
\i drizzle/migrations/0100_e19_confiance_parole_publique.sql

-- Données : O1 demande, H1 aide (M1, M2, M3, M4).
INSERT INTO public.profiles (id, first_name, city) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Odile', 'Lyon'),
  ('00000000-0000-0000-0000-0000000000b1', 'Hugo', 'Lyon');
INSERT INTO public.small_missions (id, user_id, title, city, latitude, longitude, status, date_needed) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Courses', 'Lyon', 45.764043, 4.835659, 'in_progress', CURRENT_DATE - 2),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Jardin', 'Lyon', 45.75, 4.85, 'in_progress', CURRENT_DATE - 2),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Trajet', 'Lyon', 45.75, 4.85, 'in_progress', CURRENT_DATE + 5),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Jeux', 'Lyon', 45.75, 4.85, 'in_progress', CURRENT_DATE - 2);
INSERT INTO public.small_mission_responses (mission_id, responder_id, status, accepted_at)
SELECT id, '00000000-0000-0000-0000-0000000000b1', 'accepted', now() FROM public.small_missions;
INSERT INTO public.mission_action_tokens (mission_id, helper_id, action, token)
SELECT m.id, p.id, a.action, md5(m.id::text || p.id::text || a.action)
FROM public.small_missions m
CROSS JOIN (VALUES ('00000000-0000-0000-0000-0000000000a1'::uuid), ('00000000-0000-0000-0000-0000000000b1'::uuid)) AS p(id)
CROSS JOIN (VALUES ('meetup_yes'), ('meetup_no')) AS a(action);

CREATE FUNCTION pg_temp.tok(p_mission int, p_who text, p_action text) RETURNS text LANGUAGE sql AS $f$
  SELECT md5(('00000000-0000-0000-0000-00000000000' || p_mission)::uuid::text
    || (CASE p_who WHEN 'owner' THEN '00000000-0000-0000-0000-0000000000a1' ELSE '00000000-0000-0000-0000-0000000000b1' END)::uuid::text
    || p_action)
$f$;

CREATE FUNCTION pg_temp.assert_e19(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF p_ok IS NOT TRUE THEN RAISE EXCEPTION 'Recette E19 en échec : %', p_label; END IF;
  RAISE NOTICE 'ok : %', p_label;
END $f$;

-- 1. Valeurs par défaut : case décochée.
SELECT pg_temp.assert_e19(
  (SELECT column_default FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mission_feedbacks' AND column_name = 'public_ok') = 'false',
  'mission_feedbacks.public_ok vaut false par défaut');
SELECT pg_temp.assert_e19(
  pg_get_function_arguments('public.confirm_mission_meetup(text,text,boolean,text,text)'::regprocedure)
    LIKE '%p_public_ok boolean DEFAULT false%',
  'confirm_mission_meetup : p_public_ok vaut false par défaut');
SELECT pg_temp.assert_e19(
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'confirm_mission_meetup' AND pronargs = 3),
  'ancienne signature retirée');

-- 2. M1 : seul l'aidant accepte la publication, mot modéré « ok ».
SELECT public.confirm_mission_meetup(pg_temp.tok(1, 'helper', 'meetup_yes'), 'Odile est adorable.', true, 'ok');
SELECT pg_temp.assert_e19(
  (SELECT close_reason FROM public.small_missions WHERE id = '00000000-0000-0000-0000-000000000001') = 'meetup_confirmed',
  'M1 : rencontre confirmée sur un seul oui');
SELECT pg_temp.assert_e19(
  (SELECT count(*) FROM public.public_entraide_proofs WHERE mission_id = '00000000-0000-0000-0000-000000000001') = 1
  AND (SELECT helper_first_name IS NULL AND owner_first_name IS NULL AND city = 'Lyon'
         FROM public.public_entraide_proofs WHERE mission_id = '00000000-0000-0000-0000-000000000001'),
  'M1 : un seul accord, aucun prénom public, ville seule');
SELECT pg_temp.assert_e19(
  (SELECT word FROM public.public_entraide_proofs WHERE mission_id = '00000000-0000-0000-0000-000000000001') = 'Odile est adorable.',
  'M1 : mot accepté et modéré visible');
SELECT pg_temp.assert_e19(
  (SELECT latitude_approx = 45.76 AND longitude_approx = 4.84 FROM public.public_entraide_proofs
    WHERE mission_id = '00000000-0000-0000-0000-000000000001'),
  'M1 : coordonnées arrondies à 2 décimales');
SELECT pg_temp.assert_e19(
  (SELECT count(*) FROM public.home_social_proof()) = 0,
  'accueil : aucun prénom sans double accord');

-- 3. M1 : la demandeuse répond oui avec les valeurs par défaut (case décochée).
SELECT public.confirm_mission_meetup(pg_temp.tok(1, 'owner', 'meetup_yes'));
SELECT pg_temp.assert_e19(
  (SELECT public_ok FROM public.mission_feedbacks
    WHERE mission_id = '00000000-0000-0000-0000-000000000001' AND giver_id = '00000000-0000-0000-0000-0000000000a1') = false,
  'M1 : appel sans case, accord enregistré à false');
SELECT pg_temp.assert_e19(
  (SELECT helper_first_name IS NULL FROM public.public_entraide_proofs WHERE mission_id = '00000000-0000-0000-0000-000000000001'),
  'M1 : toujours aucun prénom tant que la demandeuse refuse');

-- 4. M2 : les deux acceptent, mot sans verdict de modération.
SELECT public.confirm_mission_meetup(pg_temp.tok(2, 'helper', 'meetup_yes'), 'Merci pour le café.', true);
SELECT public.confirm_mission_meetup(pg_temp.tok(2, 'owner', 'meetup_yes'), 'Hugo a tout arrosé.', true, 'ok');
SELECT pg_temp.assert_e19(
  (SELECT helper_first_name = 'Hugo' AND owner_first_name = 'Odile' FROM public.public_entraide_proofs
    WHERE mission_id = '00000000-0000-0000-0000-000000000002'),
  'M2 : double accord, prénoms publics');
SELECT pg_temp.assert_e19(
  (SELECT comment_moderation FROM public.mission_feedbacks
    WHERE mission_id = '00000000-0000-0000-0000-000000000002' AND giver_id = '00000000-0000-0000-0000-0000000000b1') = 'unchecked',
  'M2 : mot sans verdict enregistré « unchecked »');
SELECT pg_temp.assert_e19(
  (SELECT word FROM public.public_entraide_proofs WHERE mission_id = '00000000-0000-0000-0000-000000000002') = 'Hugo a tout arrosé.',
  'M2 : seul le mot modéré « ok » est public');
SELECT pg_temp.assert_e19(
  (SELECT count(*) FROM public.public_mission_feedbacks WHERE comment = 'Merci pour le café.') = 0
  AND (SELECT count(*) FROM public.public_mission_feedbacks WHERE comment = 'Hugo a tout arrosé.') = 1,
  'profil public : mot non modéré masqué, mot modéré visible');
SELECT pg_temp.assert_e19(
  (SELECT count(*) FROM public.home_social_proof() WHERE proof_text = 'Hugo a tout arrosé.' AND first_name = 'Odile') = 1
  AND (SELECT count(*) FROM public.home_social_proof() WHERE proof_text = 'Merci pour le café.') = 0,
  'accueil : double accord et mot modéré seulement');

-- 5. M3 : coup de main annulé depuis le jeton « oui » de l'aidant.
SELECT pg_temp.assert_e19(
  (SELECT (public.confirm_mission_meetup(pg_temp.tok(3, 'helper', 'meetup_yes'), 'ignoré', true, 'ok', 'cancelled')) ->> 'cancelled') = 'true',
  'M3 : issue annulée acceptée');
SELECT pg_temp.assert_e19(
  (SELECT status::text = 'cancelled' AND close_reason = 'meetup_cancelled' FROM public.small_missions
    WHERE id = '00000000-0000-0000-0000-000000000003'),
  'M3 : besoin clos « meetup_cancelled »');
SELECT pg_temp.assert_e19(
  (SELECT count(*) FROM public.mission_feedbacks WHERE mission_id = '00000000-0000-0000-0000-000000000003') = 0,
  'M3 : aucun avis enregistré, ni positif ni négatif');
SELECT pg_temp.assert_e19(
  (SELECT count(*) FROM public.badge_attributions WHERE mission_id = '00000000-0000-0000-0000-000000000003') = 0
  AND (SELECT count(*) FROM public.public_entraide_proofs WHERE mission_id = '00000000-0000-0000-0000-000000000003') = 0,
  'M3 : ni écusson ni preuve publique');
SELECT pg_temp.assert_e19(
  (SELECT count(*) FROM public.mission_action_tokens
    WHERE mission_id = '00000000-0000-0000-0000-000000000003' AND helper_id = '00000000-0000-0000-0000-0000000000b1' AND used_at IS NULL) = 0,
  'M3 : jetons de l''aidant consommés');

-- 6. M4 : issue explicite « not_happened » depuis le jeton « oui ».
SELECT public.confirm_mission_meetup(pg_temp.tok(4, 'helper', 'meetup_yes'), NULL, false, NULL, 'not_happened');
SELECT pg_temp.assert_e19(
  (SELECT positive FROM public.mission_feedbacks
    WHERE mission_id = '00000000-0000-0000-0000-000000000004' AND giver_id = '00000000-0000-0000-0000-0000000000b1') = false
  AND (SELECT close_reason FROM public.small_missions WHERE id = '00000000-0000-0000-0000-000000000004') = 'meetup_not_happened',
  'M4 : l''issue choisie à l''écran fait foi');
SELECT pg_temp.assert_e19(
  (SELECT (public.confirm_mission_meetup(pg_temp.tok(4, 'owner', 'meetup_yes'), NULL, false, NULL, 'autre')) ->> 'reason') = 'invalid',
  'issue inconnue refusée');

-- 7. Le navigateur écrit un retour privé, quoi qu'il envoie.
SET ROLE authenticated;
INSERT INTO public.mission_feedbacks (mission_id, giver_id, receiver_id, positive, comment, public_ok, comment_moderation)
VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
        true, 'Appelez le 06 12 34 56 78', true, 'ok');
RESET ROLE;
SELECT pg_temp.assert_e19(
  (SELECT public_ok = false AND comment_moderation IS NULL FROM public.mission_feedbacks
    WHERE mission_id = '00000000-0000-0000-0000-000000000004' AND giver_id = '00000000-0000-0000-0000-0000000000a1'),
  'insert direct : public_ok et modération remis à zéro');

-- 8. Invariant de la recette : aucune ligne avec prénom sans double accord,
--    aucun mot public sans accord ni modération « ok ».
SELECT pg_temp.assert_e19(
  NOT EXISTS (
    SELECT 1 FROM public.public_entraide_proofs p
    JOIN public.small_missions m ON m.id = p.mission_id
    JOIN public.small_mission_responses r ON r.mission_id = m.id AND r.status = 'accepted'
    WHERE (p.helper_first_name IS NOT NULL OR p.owner_first_name IS NOT NULL)
      AND NOT (
        EXISTS (SELECT 1 FROM public.mission_feedbacks f WHERE f.mission_id = m.id AND f.giver_id = r.responder_id AND f.public_ok AND f.positive)
        AND EXISTS (SELECT 1 FROM public.mission_feedbacks f WHERE f.mission_id = m.id AND f.giver_id = m.user_id AND f.public_ok AND f.positive)
      )
  ),
  'invariant : aucun prénom public sans double accord');
SELECT pg_temp.assert_e19(
  NOT EXISTS (
    SELECT 1 FROM public.public_entraide_proofs p
    WHERE p.word IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.mission_feedbacks f
      WHERE f.mission_id = p.mission_id AND f.comment = p.word AND f.public_ok AND f.comment_moderation = 'ok'
    )
  ),
  'invariant : aucun mot public sans accord ni modération');

SELECT 'Recette E19 : toutes les assertions passent' AS resultat;
