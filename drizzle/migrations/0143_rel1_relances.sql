-- Lot REL1 (12/11/2026) : brouillons presque prêts et propriétaires qui tardent
-- à répondre. Spécification claude/lot-rel1-relances-brouillons-proprietaires-12-novembre-2026.md,
-- textes et décision D2 (option B) dans claude/lot-rel1-textes-valides-12-novembre-2026.md.
--
-- Ce fichier ne modifie aucune donnée existante et n'envoie rien :
--   deux drapeaux éteints, une table vide, trois fonctions réservées au rôle service.
-- Aucune colonne ajoutée à sits ni à applications : la mention vit dans une
-- table à part, pour qu'aucun déclencheur de sits (updated_at, file SEO,
-- annulations) ne parte quand elle est posée ou effacée.
-- Rejouable. Repère : rel1_relances.

-- 1. Drapeaux, éteints à la livraison (drapeau éteint = simulation, aucun envoi).
INSERT INTO public.feature_flags (key, enabled, description)
SELECT v.key, false, v.description
FROM (VALUES
  ('rel1_draft_almost_ready', 'REL1 : email « Votre annonce est presque prête » aux brouillons presque prêts'),
  ('rel1_owner_silent', 'REL1 : seconde relance du propriétaire à 7 jours, message au candidat et mention à 10 jours')
) AS v(key, description)
WHERE NOT EXISTS (SELECT 1 FROM public.feature_flags f WHERE f.key = v.key);

-- 2. Mention « Réponse du propriétaire en attente », par candidature.
--    Lue par le seul candidat concerné (option B).
CREATE TABLE IF NOT EXISTS public.owner_response_pending (
  application_id uuid PRIMARY KEY REFERENCES public.applications(id) ON DELETE CASCADE,
  sit_id uuid NOT NULL REFERENCES public.sits(id) ON DELETE CASCADE,
  sitter_id uuid NOT NULL,
  since timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz,
  notified_at timestamptz
);

CREATE INDEX IF NOT EXISTS owner_response_pending_sitter_active_idx
  ON public.owner_response_pending (sitter_id) WHERE cleared_at IS NULL;

ALTER TABLE public.owner_response_pending ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_response_pending_sitter_select ON public.owner_response_pending;
CREATE POLICY owner_response_pending_sitter_select ON public.owner_response_pending
  FOR SELECT TO authenticated
  USING (sitter_id = auth.uid() AND cleared_at IS NULL);

REVOKE ALL ON public.owner_response_pending FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.owner_response_pending TO authenticated;
GRANT ALL ON public.owner_response_pending TO service_role;

-- 3. Brouillons presque prêts (règle A de la spécification).
CREATE OR REPLACE FUNCTION public.detect_almost_ready_drafts()
RETURNS TABLE(
  id uuid, user_id uuid, owner_email text, owner_first_name text,
  title text, city text, start_date date, end_date date,
  absence_reason text, sitter_expectations text, cover_photo_url text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  -- rel1_relances
  SELECT s.id, s.user_id, lower(btrim(p.email)), p.first_name,
         s.title, COALESCE(NULLIF(btrim(s.city), ''), p.city), s.start_date::date, s.end_date::date,
         s.absence_reason, s.sitter_expectations, s.cover_photo_url,
         s.updated_at
  FROM public.sits s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.status = 'draft'
    AND s.start_date::date >= (now() AT TIME ZONE 'Europe/Paris')::date + 3
    AND s.end_date::date > s.start_date::date
    AND length(btrim(COALESCE(s.absence_reason, ''))) >= 15
    AND length(btrim(COALESCE(s.sitter_expectations, ''))) >= 15
    AND s.updated_at < now() - interval '48 hours'
    AND p.account_status = 'active'
    AND NULLIF(btrim(p.email), '') IS NOT NULL
    AND p.last_seen_at > now() - interval '60 days'
    AND NOT EXISTS (SELECT 1 FROM public.email_preferences ep
                    WHERE ep.user_id = s.user_id AND ep.product_emails = false)
    AND NOT EXISTS (SELECT 1 FROM public.suppressed_emails se
                    WHERE se.email = lower(btrim(p.email)))
    -- une seule fois par annonce (un refus définitif compte, un échec non)
    AND NOT EXISTS (SELECT 1 FROM public.email_send_log l
                    WHERE l.template_name = 'sit-draft-almost-ready'
                      AND (l.metadata->>'sit_id' = s.id::text
                           OR l.metadata->>'idempotency_key' = 'sit-draft-almost-ready-' || s.id::text)
                      AND l.status NOT IN ('failed', 'dlq'))
    -- 7 jours après toute relance de brouillon vers la même personne
    AND NOT EXISTS (SELECT 1 FROM public.email_send_log l
                    WHERE l.template_name IN ('sit-draft-reminder', 'sit-draft-almost-ready')
                      AND l.recipient_email = lower(btrim(p.email))
                      AND l.status IN ('sent', 'pending', 'deferred')
                      AND l.created_at > now() - interval '7 days')
  ORDER BY s.updated_at ASC, s.id ASC
  LIMIT 100;
$fn$;

REVOKE ALL ON FUNCTION public.detect_almost_ready_drafts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_almost_ready_drafts() TO service_role;

-- 4. Candidatures sans réponse depuis p_days jours (règles B1 à 7 jours, B2 à 10).
--    Une ligne par candidature, avec les faits utiles à la décision :
--    adresse du propriétaire en liste de suppression, seconde relance déjà
--    tracée pour l'annonce, et date à laquelle elle est partie ou a été refusée.
CREATE OR REPLACE FUNCTION public.detect_unanswered_applications(p_days integer)
RETURNS TABLE(
  application_id uuid, sit_id uuid, sit_title text, sit_city text, sit_start_date date,
  sitter_id uuid, sitter_first_name text, sitter_email text,
  owner_id uuid, owner_first_name text, owner_email text,
  days_since_created integer, owner_suppressed boolean,
  second_nudge_logged boolean, second_nudge_settled_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  -- rel1_relances
  SELECT a.id, a.sit_id, s.title, s.city, s.start_date::date,
         a.sitter_id, sitter.first_name, lower(btrim(sitter.email)),
         s.user_id, o.first_name, NULLIF(lower(btrim(o.email)), ''),
         (EXTRACT(EPOCH FROM (now() - a.created_at))::integer / 86400),
         EXISTS (SELECT 1 FROM public.suppressed_emails se WHERE se.email = lower(btrim(o.email))),
         EXISTS (SELECT 1 FROM public.email_send_log l
                 WHERE l.template_name = 'owner-pending-applications-second-nudge'
                   AND (l.metadata->>'sit_id' = s.id::text
                        OR l.metadata->>'idempotency_key' = 'pending-apps-second-' || s.id::text)
                   AND l.status NOT IN ('failed', 'dlq')),
         (SELECT min(l.created_at) FROM public.email_send_log l
          WHERE l.template_name = 'owner-pending-applications-second-nudge'
            AND (l.metadata->>'sit_id' = s.id::text
                 OR l.metadata->>'idempotency_key' = 'pending-apps-second-' || s.id::text)
            AND l.status NOT IN ('failed', 'dlq', 'pending', 'deferred'))
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  JOIN public.profiles sitter ON sitter.id = a.sitter_id
  JOIN public.profiles o ON o.id = s.user_id
  WHERE a.status IN ('pending'::application_status, 'viewed'::application_status)
    AND a.created_at < now() - make_interval(days => GREATEST(COALESCE(p_days, 7), 1))
    AND s.status = 'published'::sit_status
    AND s.start_date::date >= (now() AT TIME ZONE 'Europe/Paris')::date
    -- le propriétaire n'a rien écrit à ce candidat
    AND NOT EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.messages m ON m.conversation_id = c.id
      WHERE c.sit_id = a.sit_id
        AND c.sitter_id = a.sitter_id
        AND m.sender_id = s.user_id
        AND COALESCE(m.is_system, false) = false
    )
  ORDER BY a.created_at ASC, a.id ASC
  LIMIT 500;
$fn$;

REVOKE ALL ON FUNCTION public.detect_unanswered_applications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_unanswered_applications(integer) TO service_role;

-- 5. Pose et efface la mention. Appelée seulement drapeau allumé.
--    Pose : les candidatures passées en paramètre, si elles sont encore dans la
--    cible (date de la première pose conservée). Efface : toute mention dont la
--    candidature a quitté la cible (réponse du propriétaire, statut changé,
--    annonce retirée, garde commencée).
CREATE OR REPLACE FUNCTION public.sync_owner_response_pending(p_application_ids uuid[], p_days integer DEFAULT 10)
RETURNS TABLE(marked integer, cleared integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- rel1_relances
DECLARE
  v_target uuid[];
  v_marked integer := 0;
  v_cleared integer := 0;
BEGIN
  SELECT COALESCE(array_agg(d.application_id), '{}'::uuid[]) INTO v_target
  FROM public.detect_unanswered_applications(p_days) d;

  WITH up AS (
    INSERT INTO public.owner_response_pending (application_id, sit_id, sitter_id)
    SELECT a.id, a.sit_id, a.sitter_id
    FROM public.applications a
    WHERE a.id = ANY (v_target)
      AND a.id = ANY (COALESCE(p_application_ids, '{}'::uuid[]))
    ON CONFLICT (application_id) DO UPDATE SET cleared_at = NULL
      WHERE public.owner_response_pending.cleared_at IS NOT NULL
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_marked FROM up;

  WITH down AS (
    UPDATE public.owner_response_pending p SET cleared_at = now()
    WHERE p.cleared_at IS NULL
      AND NOT (p.application_id = ANY (v_target))
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_cleared FROM down;

  RETURN QUERY SELECT v_marked, v_cleared;
END;
$fn$;

REVOKE ALL ON FUNCTION public.sync_owner_response_pending(uuid[], integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_owner_response_pending(uuid[], integer) TO service_role;
