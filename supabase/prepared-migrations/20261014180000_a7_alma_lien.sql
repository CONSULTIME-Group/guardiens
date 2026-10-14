-- Lot A7 (14/10/2026) : le lien avec Alma.
--
-- my_alma_bond_signals() rend, pour le membre connecté seulement, les signaux
-- datés que le site ne peut pas lire lui-même (échanges avec Alma, réservés à
-- l'équipe par la RLS ; historique des statuts de garde ; avis publiés reçus ;
-- coups de main rendus ; écussons ; gardien d'urgence). Une seule lecture,
-- appelée par le site (carnet, dock) et par alma-chat avec le jeton du membre.
-- Rejouable : CREATE OR REPLACE, droits remis à chaque passage.

CREATE OR REPLACE FUNCTION public.my_alma_bond_signals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_out jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  WITH my_sits AS (
    -- Gardes dont le membre est partie : propriétaire avec un gardien retenu, ou gardien retenu.
    SELECT s.id, s.end_date
      FROM public.sits s
     WHERE (s.user_id = v_uid OR EXISTS (
              SELECT 1 FROM public.applications a
               WHERE a.sit_id = s.id AND a.sitter_id = v_uid AND a.status = 'accepted'))
       AND EXISTS (SELECT 1 FROM public.applications a2 WHERE a2.sit_id = s.id AND a2.status = 'accepted')
  ),
  confirmed AS (
    SELECT h.sit_id, h.changed_at
      FROM public.sit_status_history h
      JOIN my_sits m ON m.id = h.sit_id
     WHERE h.new_status = 'confirmed'
     ORDER BY h.changed_at ASC
     LIMIT 1
  ),
  completed AS (
    SELECT m.id, m.end_date
      FROM my_sits m
     WHERE public.sit_is_reviewable(m.id)
  ),
  first_completed AS (
    SELECT id, end_date FROM completed WHERE end_date IS NOT NULL ORDER BY end_date ASC LIMIT 1
  ),
  alma AS (
    SELECT count(*)::int AS n, min(c.created_at) AS first_at
      FROM public.alma_conversations c
     WHERE c.user_id = v_uid AND c.answer IS NOT NULL
  ),
  rev AS (
    SELECT count(*)::int AS n, min(r.created_at) AS first_at
      FROM public.reviews r
     WHERE r.reviewee_id = v_uid
       AND r.published = true
       AND r.moderation_status = 'valide'
       AND r.moderation_hidden_at IS NULL
       AND coalesce(r.review_type, 'garde') = 'garde'
  ),
  help AS (
    SELECT count(*)::int AS n, min(coalesce(r.accepted_at, r.created_at)) AS first_at
      FROM public.small_mission_responses r
     WHERE r.responder_id = v_uid AND r.status = 'accepted'
  ),
  badges AS (
    SELECT count(*)::int AS n, min(b.created_at) AS first_at
      FROM public.badge_attributions b
     WHERE b.user_id = v_uid
  )
  SELECT jsonb_build_object(
    'member_since', (SELECT p.created_at FROM public.profiles p WHERE p.id = v_uid),
    'alma_exchanges', (SELECT n FROM alma),
    'alma_first_at', (SELECT first_at FROM alma),
    'first_confirmed_at', (SELECT changed_at FROM confirmed),
    'first_confirmed_sit_id', (SELECT sit_id FROM confirmed),
    'completed_count', (SELECT count(*)::int FROM completed),
    'first_completed_end', (SELECT end_date FROM first_completed),
    'first_completed_sit_id', (SELECT id FROM first_completed),
    'reviews_received', (SELECT n FROM rev),
    'first_review_at', (SELECT first_at FROM rev),
    'help_given', (SELECT n FROM help),
    'first_help_at', (SELECT first_at FROM help),
    'badges', (SELECT n FROM badges),
    'first_badge_at', (SELECT first_at FROM badges),
    'emergency_since', (SELECT e.created_at FROM public.emergency_sitter_profiles e WHERE e.user_id = v_uid AND e.is_active LIMIT 1)
  ) INTO v_out;

  RETURN v_out;
END;
$function$;

COMMENT ON FUNCTION public.my_alma_bond_signals() IS
  'Lot A7 : signaux datés du lien avec Alma, pour le membre connecté (auth.uid()) seulement. Aucun email, aucune donnée d''autrui.';

REVOKE ALL ON FUNCTION public.my_alma_bond_signals() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_alma_bond_signals() FROM anon;
REVOKE ALL ON FUNCTION public.my_alma_bond_signals() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.my_alma_bond_signals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_alma_bond_signals() TO service_role;
