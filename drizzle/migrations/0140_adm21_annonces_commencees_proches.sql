-- ADM21 (11/11/2026, suite de l'audit admin) : la file startedWaiting de
-- admin_human_queues ne retient que les annonces dont la garde se termine
-- dans les 30 jours (ou sans date de fin). Une annonce « a la demande » dont
-- la periode court sur plusieurs mois reste ouverte sans occuper la liste de
-- travail (le 11/11/2026 : Siros, periode du 01/11/2026 au 31/07/2027).
-- Corps repris de pg_get_functiondef, memes droits, aucune donnee modifiee,
-- rejouable (repere adm21_fin_sous_30_jours).
DO $adm21$
DECLARE
  q text := pg_get_functiondef('public.admin_human_queues()'::regprocedure);
  a_q constant text := $a$         AND s.start_date::date < (now() AT TIME ZONE 'Europe/Paris')::date
         AND a.status IN ('pending', 'viewed', 'discussing')),
$a$;
BEGIN
  IF position('adm21_fin_sous_30_jours' IN q) > 0 THEN
    RETURN;
  END IF;
  IF position(a_q IN q) = 0 THEN
    RAISE EXCEPTION 'ADM21 : ancre absente de admin_human_queues, migration a reprendre depuis pg_get_functiondef';
  END IF;
  q := replace(q, a_q, $n$         AND s.start_date::date < (now() AT TIME ZONE 'Europe/Paris')::date
         -- adm21_fin_sous_30_jours
         AND (s.end_date IS NULL OR s.end_date::date <= (now() AT TIME ZONE 'Europe/Paris')::date + 30)
         AND a.status IN ('pending', 'viewed', 'discussing')),
$n$);
  EXECUTE q;
END
$adm21$;
