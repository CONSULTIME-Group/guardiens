-- Lot E21 (25/10/2026, maquette validée par Jérémie) : la barre basse de la
-- fiche d'un besoin dit « {N} personnes prévenues ». Le nombre vient de
-- mission_notification_queue (emails de vague partis, sent_at non nul), table
-- lisible par l'équipe seule. Cette fonction renvoie le seul nombre, sans
-- aucune donnée personnelle, pour un besoin d'entraide ouvert ou en cours.
-- Rejouable.
CREATE OR REPLACE FUNCTION public.mission_notified_count(p_mission_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.small_missions s
      WHERE s.id = p_mission_id
        AND s.status IN ('open', 'in_progress')
        AND s.category IS DISTINCT FROM 'projet'
    )
    THEN (
      SELECT count(DISTINCT q.helper_id)::integer
      FROM public.mission_notification_queue q
      WHERE q.mission_id = p_mission_id AND q.sent_at IS NOT NULL
    )
    ELSE NULL
  END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mission_notified_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mission_notified_count(uuid) TO anon, authenticated, service_role;
