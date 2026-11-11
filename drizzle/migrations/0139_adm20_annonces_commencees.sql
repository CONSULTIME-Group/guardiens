-- ADM20 (11/11/2026, audit de l'espace admin, « go tout » de Jeremie).
-- 1. admin_human_queues gagne la file startedWaiting : annonces encore
--    publiees dont la date de debut est passee (jour de Paris) et qui portent
--    au moins une candidature en attente, vue ou en discussion. Compte =
--    nombre d'annonces, oldest = plus ancienne candidature en attente.
--    Le 11/11/2026 : 2 annonces, 11 candidatures, hors de toute file.
-- 2. detect_pending_applications ne signale plus une candidature dont la
--    garde a commence : auto_resolve_admin_signals fermait ces signaux dans
--    les minutes suivantes (motif auto_resolved_sit_started), 109 signaux
--    critiques crees pour 12 candidatures en 7 jours.
-- Corps repris de pg_get_functiondef en production, memes droits, aucune
-- donnee modifiee, rejouable (reperes adm20_annonces_commencees et
-- adm20_garde_a_venir).
DO $adm20$
DECLARE
  q text := pg_get_functiondef('public.admin_human_queues()'::regprocedure);
  d text := pg_get_functiondef('public.detect_pending_applications()'::regprocedure);
  a_q constant text := $a$  SELECT jsonb_build_array(
$a$;
  a_d constant text := $a$    AND COALESCE(s.end_date::date, s.start_date::date) >= current_date - 7
$a$;
BEGIN
  IF position('adm20_annonces_commencees' IN q) = 0 THEN
    IF position(a_q IN q) = 0 THEN
      RAISE EXCEPTION 'ADM20 : ancre absente de admin_human_queues, migration a reprendre depuis pg_get_functiondef';
    END IF;
    q := replace(q, a_q, a_q || $n$    -- adm20_annonces_commencees
    (SELECT jsonb_build_object('key', 'startedWaiting', 'count', count(DISTINCT s.id), 'oldest', min(a.created_at))
       FROM sits s
       JOIN applications a ON a.sit_id = s.id
       WHERE s.status = 'published'
         AND s.start_date::date < (now() AT TIME ZONE 'Europe/Paris')::date
         AND a.status IN ('pending', 'viewed', 'discussing')),
$n$);
    EXECUTE q;
  END IF;
  IF position('adm20_garde_a_venir' IN d) = 0 THEN
    IF position(a_d IN d) = 0 THEN
      RAISE EXCEPTION 'ADM20 : ancre absente de detect_pending_applications, migration a reprendre depuis pg_get_functiondef';
    END IF;
    d := replace(d, a_d, a_d || $n$    -- adm20_garde_a_venir : une garde commencee sort de la relance automatique.
    AND s.start_date::date >= (now() AT TIME ZONE 'Europe/Paris')::date
$n$);
    EXECUTE d;
  END IF;
END
$adm20$;
