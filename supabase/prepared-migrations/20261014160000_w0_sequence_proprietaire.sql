-- Lot W0 (14/10/2026) : séquence propriétaire propre.
-- Source : claude/audit-workflow-emails-proprietaires-14-octobre-2026.md et
-- l'état réel de la base relu le 14/10/2026 (lecture seule) :
--   onboarding-owner actif, 14 parcours actifs (pas 0 à 3), étapes J+1
--   onboarding-j1, J+3 conseils-publication-annonce, J+7
--   conseils-annonce-personnalises, J+14 relance-profil-incomplet ;
--   owner-no-sit-relance actif, 18 parcours actifs (pas 0 à 2), étapes
--   owner-no-sit-j3, j10, j21 ; reactivation-d30, 299 parcours actifs.
-- Fichier rejouable : CREATE OR REPLACE, ADD COLUMN IF NOT EXISTS, UPDATE
-- gardés par leur état de départ. Convention Y2 : tout REVOKE vise PUBLIC,
-- anon et authenticated nommément, puis un GRANT rend l'accès voulu.

-- =========================================================================
-- W0.1. Définition unique de « jamais publié » : aucune annonce avec
-- published_at renseigné. Un brouillon jamais mis en ligne ne compte pas.
-- Équivalent TypeScript : supabase/functions/_shared/published-sit.ts.
-- Fonction de service, réservée au service_role.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.has_published_sit(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.sits s
    WHERE s.user_id = _user_id
      AND s.published_at IS NOT NULL
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.has_published_sit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_published_sit(uuid) TO service_role;

COMMENT ON FUNCTION public.has_published_sit(uuid) IS
  'Lot W0 : vrai si le membre a au moins une annonce avec published_at. Définition unique de « jamais publié » (miroir TS : _shared/published-sit.ts).';

-- Rattrapage : une annonce passée en ligne puis archivée avant le
-- remplissage de published_at garde published_at vide. Relu le 14/10/2026 :
-- 2 annonces archivées (a3a6bc12, b970bb4b), avec candidatures et un passage
-- « published » dans sit_status_history. La date de première mise en ligne
-- de l'historique les rend « publiées ». Seule la colonne published_at
-- change, aucun déclencheur de statut ne se réveille.
UPDATE public.sits s
SET published_at = h.first_published
FROM (
  SELECT sit_id, min(changed_at) AS first_published
  FROM public.sit_status_history
  WHERE new_status = 'published'
  GROUP BY sit_id
) h
WHERE h.sit_id = s.id
  AND s.published_at IS NULL;

-- =========================================================================
-- W0.2. Saut d'étape sans sortie de parcours.
-- exit_condition sort tout le parcours ; skip_condition saute la seule étape
-- et laisse les suivantes (evaluate-journeys, decideStep).
-- =========================================================================
ALTER TABLE public.nurturing_steps ADD COLUMN IF NOT EXISTS skip_condition jsonb;

COMMENT ON COLUMN public.nurturing_steps.skip_condition IS
  'Lot W0 : condition qui saute cette étape seule, le parcours continue (ex. onboarding-j1 sauté pour un profil à 60 %).';

-- =========================================================================
-- W0.3. Une seule séquence propriétaire : onboarding-owner.
-- J+1 onboarding-j1 (sauté à 60 % de profil, règle actuelle), J+3
-- owner-no-sit-j3, J+10 owner-no-sit-j10, J+21 owner-no-sit-j21, sortie à la
-- publication à chaque étape. conseils-publication-annonce,
-- conseils-annonce-personnalises et relance-profil-incomplet quittent la
-- séquence (gabarits conservés).
-- =========================================================================
UPDATE public.nurturing_steps st
SET delay_hours = 24,
    template_name = 'onboarding-j1',
    exit_condition = '{"type": "has_published_sit"}'::jsonb,
    skip_condition = '{"type": "profile_complete", "threshold": 60}'::jsonb
FROM public.nurturing_sequences sq
WHERE st.sequence_id = sq.id AND sq.key = 'onboarding-owner' AND st.step_order = 1;

UPDATE public.nurturing_steps st
SET delay_hours = 72,
    template_name = 'owner-no-sit-j3',
    exit_condition = '{"type": "has_published_sit"}'::jsonb,
    skip_condition = NULL
FROM public.nurturing_sequences sq
WHERE st.sequence_id = sq.id AND sq.key = 'onboarding-owner' AND st.step_order = 2;

UPDATE public.nurturing_steps st
SET delay_hours = 240,
    template_name = 'owner-no-sit-j10',
    exit_condition = '{"type": "has_published_sit"}'::jsonb,
    skip_condition = NULL
FROM public.nurturing_sequences sq
WHERE st.sequence_id = sq.id AND sq.key = 'onboarding-owner' AND st.step_order = 3;

UPDATE public.nurturing_steps st
SET delay_hours = 504,
    template_name = 'owner-no-sit-j21',
    exit_condition = '{"type": "has_published_sit"}'::jsonb,
    skip_condition = NULL
FROM public.nurturing_sequences sq
WHERE st.sequence_id = sq.id AND sq.key = 'onboarding-owner' AND st.step_order = 4;

-- Contrôle : quatre étapes exactement, dans l'ordre attendu.
DO $$
DECLARE
  _got text;
BEGIN
  SELECT string_agg(st.step_order || ':' || st.template_name, ',' ORDER BY st.step_order)
    INTO _got
  FROM public.nurturing_steps st
  JOIN public.nurturing_sequences sq ON sq.id = st.sequence_id
  WHERE sq.key = 'onboarding-owner';
  IF _got IS DISTINCT FROM '1:onboarding-j1,2:owner-no-sit-j3,3:owner-no-sit-j10,4:owner-no-sit-j21' THEN
    RAISE EXCEPTION 'W0 : étapes onboarding-owner inattendues : %', _got;
  END IF;
END $$;

UPDATE public.nurturing_sequences
SET description = 'Propriétaire jamais publié : J+1 onboarding-j1, J+3, J+10, J+21 owner-no-sit, sortie à la publication (lot W0).',
    updated_at = now()
WHERE key = 'onboarding-owner';

-- =========================================================================
-- W0.4. Transition des parcours en cours, sans doublon.
-- Rangs de l'ancienne séquence onboarding-owner : 1 onboarding-j1, 2 et 3
-- conseils (demande de publication déjà faite), 4 relance profil. Nouveau
-- rang = demandes déjà faites : 0→0, 1→1, 2→2, 3→2, 4→3.
-- Les relances owner-no-sit portent désormais le nom du gabarit dans leur
-- clé d'envoi et evaluate-journeys saute tout gabarit à envoi unique déjà
-- parti (templateAlreadySent) : aucune relance ne repart deux fois.
-- Rejouable : a), b) et c) ne s'appliquent que tant que owner-no-sit-relance
-- est encore active, et la séquence s'éteint en fin de section.
-- =========================================================================

-- a) onboarding-owner actifs : renumérotation.
UPDATE public.user_journeys
SET current_step = CASE current_step WHEN 3 THEN 2 WHEN 4 THEN 3 ELSE current_step END,
    updated_at = now()
WHERE sequence_key = 'onboarding-owner'
  AND status = 'active'
  AND current_step IN (3, 4)
  AND EXISTS (SELECT 1 FROM public.nurturing_sequences s0 WHERE s0.key = 'owner-no-sit-relance' AND s0.active);

-- b) owner-no-sit-relance actifs : rattachés à onboarding-owner, rang + 1
--    (onboarding-j1 compté comme passé, j3 au rang 2, j10 au rang 3).
UPDATE public.user_journeys j
SET sequence_key = 'onboarding-owner',
    current_step = LEAST(j.current_step + 1, 4),
    updated_at = now()
WHERE j.sequence_key = 'owner-no-sit-relance'
  AND j.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_journeys o
    WHERE o.user_id = j.user_id AND o.sequence_key = 'onboarding-owner' AND o.status = 'active'
  )
  AND EXISTS (SELECT 1 FROM public.nurturing_sequences s0 WHERE s0.key = 'owner-no-sit-relance' AND s0.active);

-- c) Propriétaires jamais publiés, inscrits depuis 21 jours au plus, sortis
--    de l'ancienne séquence (profil à 60 % ou fin des 4 étapes) sans jamais
--    entrer dans owner-no-sit-relance (la fenêtre se fermait à J+10) : le
--    parcours reprend là où il s'était arrêté. Un seul parcours par personne.
WITH last_onboarding AS (
  SELECT DISTINCT ON (j.user_id) j.id, j.user_id, j.status, j.exit_reason
  FROM public.user_journeys j
  WHERE j.sequence_key = 'onboarding-owner'
  ORDER BY j.user_id, j.created_at DESC
), reopen AS (
  SELECT l.id,
         CASE
           WHEN l.status = 'completed' THEN 3
           WHEN l.exit_reason = 'step_1_profile_complete' THEN 1
           WHEN l.exit_reason = 'step_2_profile_complete' THEN 1
           WHEN l.exit_reason = 'step_3_profile_complete' THEN 2
           WHEN l.exit_reason = 'step_4_profile_complete' THEN 2
         END AS new_step
  FROM last_onboarding l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.status IN ('exited', 'completed')
    AND (l.status = 'completed' OR l.exit_reason LIKE 'step\__\_profile\_complete')
    AND p.role IN ('owner', 'both')
    AND p.account_status = 'active'
    AND p.email IS NOT NULL
    AND p.created_at > now() - interval '21 days'
    AND NOT public.has_published_sit(l.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.user_journeys o WHERE o.user_id = l.user_id AND o.status = 'active')
    AND NOT EXISTS (SELECT 1 FROM public.user_journeys o WHERE o.user_id = l.user_id AND o.sequence_key = 'owner-no-sit-relance')
)
UPDATE public.user_journeys j
SET status = 'active',
    current_step = r.new_step,
    last_step_at = COALESCE(j.completed_at, j.last_step_at, now()),
    completed_at = NULL,
    exit_reason = NULL,
    transient_failure_count = 0,
    updated_at = now()
FROM reopen r
WHERE j.id = r.id
  AND r.new_step IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.nurturing_sequences s0 WHERE s0.key = 'owner-no-sit-relance' AND s0.active);

-- L'ancienne séquence de rattrapage s'éteint : ses étapes vivent désormais
-- dans onboarding-owner.
UPDATE public.nurturing_sequences
SET active = false,
    description = 'Remplacée par onboarding-owner au lot W0 (14/10/2026).',
    updated_at = now()
WHERE key = 'owner-no-sit-relance' AND active = true;

-- d) reactivation-d30 : texte de gardien, jamais pour un rôle owner qui n'a
--    jamais publié (le code l'exclut aussi à l'enrôlement et à l'envoi).
UPDATE public.user_journeys j
SET status = 'exited',
    exit_reason = 'owner_never_published',
    completed_at = now(),
    updated_at = now()
FROM public.profiles p
WHERE p.id = j.user_id
  AND j.sequence_key = 'reactivation-d30'
  AND j.status = 'active'
  AND p.role = 'owner'
  AND NOT public.has_published_sit(j.user_id);

-- Contrôle : aucun parcours actif ne reste sur la séquence éteinte.
DO $$
DECLARE
  _left integer;
BEGIN
  SELECT count(*) INTO _left FROM public.user_journeys
  WHERE sequence_key = 'owner-no-sit-relance' AND status = 'active';
  IF _left > 0 THEN
    RAISE EXCEPTION 'W0 : % parcours actifs restent sur owner-no-sit-relance', _left;
  END IF;
END $$;
