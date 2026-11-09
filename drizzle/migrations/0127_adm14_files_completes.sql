-- Lot ADM14 · La vue d'ensemble devient la liste, une pastille (lot 3 du plan
-- de l'arène admin du 09/11/2026, « go lot 3 » de Jérémie).
--
-- Le menu ne porte plus qu'une pastille, celle de la vue d'ensemble, égale au
-- nombre de lignes de la liste de travail (admin_work_list). Les files que le
-- menu signalait seul par sa pastille entrent donc dans la liste : sans cela,
-- un avis d'annulation, une expérience, une compétence, une demande de guide
-- ou une demande d'analyse en attente ne se verraient plus nulle part.
-- Mêmes définitions que admin_menu_badges, plus la date du plus ancien.
-- La partie « compétences libres saisies dans les profils » de l'ancienne
-- pastille reste à l'écran Compétences : elle compte des mots, pas une
-- demande en attente.
-- Erreurs du site : le voyant ne regarde que les erreurs apparues en 24 h ;
-- la file errorsOld compte celles, non résolues, apparues avant, qu'aucune
-- pastille ne signalerait plus. Rejouable.

CREATE OR REPLACE FUNCTION public.admin_human_queues()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_array(
    (SELECT jsonb_build_object('key', 'contactMessages', 'count', count(*), 'oldest', min(created_at))
       FROM contact_messages WHERE status IN ('new', 'en_cours')),
    (SELECT jsonb_build_object('key', 'reports', 'count', count(*), 'oldest', min(created_at))
       FROM reports WHERE status IN ('new', 'in_progress')),
    (SELECT jsonb_build_object('key', 'deletionRequests', 'count', count(*), 'oldest', min(requested_at))
       FROM account_deletion_requests WHERE status = 'pending'),
    (SELECT jsonb_build_object('key', 'reviewDisputes', 'count', count(*), 'oldest', min(created_at))
       FROM review_disputes WHERE status = 'pending'),
    (SELECT jsonb_build_object('key', 'verifications', 'count', count(*), 'oldest', NULL)
       FROM profiles
       WHERE identity_verification_status IN ('pending', 'needs_review')
          OR (identity_verification_status = 'not_submitted'
              AND (identity_document_url IS NOT NULL OR identity_selfie_url IS NOT NULL))),
    -- adm14_files_completes
    (SELECT jsonb_build_object('key', 'reviewsModeration', 'count', count(*), 'oldest', min(created_at))
       FROM reviews
       WHERE review_type = 'annulation'
         AND (moderation_status = 'en_attente' OR response_status = 'en_attente')),
    (SELECT jsonb_build_object('key', 'experiences', 'count', count(*), 'oldest', min(created_at))
       FROM external_experiences WHERE verification_status = 'pending'),
    (SELECT jsonb_build_object('key', 'skills', 'count', count(*), 'oldest', min(created_at))
       FROM skills_library WHERE status = 'pending'),
    (SELECT jsonb_build_object('key', 'guideRequests', 'count', count(*), 'oldest', min(created_at))
       FROM guide_requests WHERE status = 'pending'),
    (SELECT jsonb_build_object('key', 'analysisRequests', 'count', count(*), 'oldest', min(created_at))
       FROM analysis_requests WHERE status = 'new'),
    (SELECT jsonb_build_object('key', 'errorsOld', 'count', count(*), 'oldest', min(first_seen_at))
       FROM error_logs
       WHERE resolved_at IS NULL
         AND severity IS DISTINCT FROM 'ignored_third_party'
         AND first_seen_at <= now() - interval '24 hours')
  );
$function$;

REVOKE ALL ON FUNCTION public.admin_human_queues() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_human_queues() TO service_role;

