-- Lot A3 (14/10/2026) : mesure propre d'Alma (audit Alma en arène du
-- 14/10/2026, claude/audit-alma-arene-14-octobre-2026.md, lot 3).
--
-- Constat (base, 30 jours au 14/10/2026) : 548 des 609 événements
-- alma_conversation_message_sent sont anonymes, écrits par les tests du dépôt
-- (Linux, 1024 x 768, surfaces owner_dashboard, sitter_dashboard et « x »).
-- L'entonnoir de /admin (DiscoveryFunnelCard) lisait admin_a10_event_counts,
-- qui compte toutes les lignes : 609 messages pour 519 ouvertures, plus de
-- 100 %. Les ouvertures automatiques (origin whisper, 449) et volontaires
-- (avatar, pill, peek, 70) y étaient confondues.
--
-- Nouvelle fonction dédiée à l'entonnoir : membres connectés seulement
-- (user_id non nul), comptes administrateurs exclus, ouverture volontaire
-- séparée de l'ouverture automatique. admin_a10_event_counts reste inchangée
-- (définition relue en production le 14/10/2026, pg_get_functiondef).
-- Ouverture automatique : alma_dock_expanded avec metadata.origin = whisper,
-- seule origine posée par l'ouverture spontanée (AlmaDock.tsx, lot P1) ;
-- openPanel n'est jamais appelé avec « whisper ».
-- Fichier rejouable : CREATE OR REPLACE, droits reposés à chaque passage.

CREATE OR REPLACE FUNCTION public.admin_a3_alma_funnel_counts(p_since timestamptz)
RETURNS TABLE(step text, n bigint, members bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN QUERY
  SELECT
    CASE
      WHEN e.event_type = 'alma_dock_expanded' AND coalesce(e.metadata->>'origin', '') = 'whisper' THEN 'opened_automatic'
      WHEN e.event_type = 'alma_dock_expanded' THEN 'opened_voluntary'
      ELSE e.event_type::text
    END AS step,
    count(*)::bigint AS n,
    count(DISTINCT e.user_id)::bigint AS members
  FROM analytics_events e
  WHERE e.event_type IN (
      'alma_dock_expanded',
      'alma_composer_seen',
      'alma_prompt_suggestion_clicked',
      'alma_composer_focused',
      'alma_composer_typed',
      'alma_conversation_message_sent',
      'alma_action_clicked'
    )
    AND e.created_at >= p_since
    AND e.user_id IS NOT NULL
    AND NOT public.has_role(e.user_id, 'admin'::public.app_role)
  GROUP BY 1
  UNION ALL
  -- Toutes ouvertures confondues : membres distincts sans double compte.
  SELECT 'alma_dock_expanded'::text, count(*)::bigint, count(DISTINCT e.user_id)::bigint
  FROM analytics_events e
  WHERE e.event_type = 'alma_dock_expanded'
    AND e.created_at >= p_since
    AND e.user_id IS NOT NULL
    AND NOT public.has_role(e.user_id, 'admin'::public.app_role);
END $function$;

REVOKE ALL ON FUNCTION public.admin_a3_alma_funnel_counts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_a3_alma_funnel_counts(timestamptz) TO authenticated, service_role;

-- Contrôle après application (lecture seule, compte admin requis pour la
-- fonction ; la requête directe ci-dessous donne les mêmes chiffres) :
-- SELECT CASE WHEN event_type = 'alma_dock_expanded' AND metadata->>'origin' = 'whisper' THEN 'opened_automatic'
--             WHEN event_type = 'alma_dock_expanded' THEN 'opened_voluntary' ELSE event_type END AS step,
--        count(*) AS n, count(DISTINCT user_id) AS members
--   FROM analytics_events
--  WHERE event_type IN ('alma_dock_expanded', 'alma_composer_seen', 'alma_prompt_suggestion_clicked',
--                       'alma_composer_focused', 'alma_composer_typed', 'alma_conversation_message_sent',
--                       'alma_action_clicked')
--    AND created_at >= now() - interval '30 days'
--    AND user_id IS NOT NULL AND NOT public.has_role(user_id, 'admin'::public.app_role)
--  GROUP BY 1 ORDER BY 1;
-- Attendu au 14/10/2026 : opened_automatic 438, opened_voluntary 65,
-- alma_conversation_message_sent 55 (aucune ligne anonyme).
