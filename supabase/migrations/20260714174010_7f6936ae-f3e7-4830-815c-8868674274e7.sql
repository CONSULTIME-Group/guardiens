CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(total_inscrits bigint, maisons_gardees bigint, missions_entraide bigint, animaux_accompagnes bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH gardes_realisees AS (
    SELECT s.id, s.property_id
    FROM public.sits s
    WHERE s.status IN ('completed'::sit_status, 'archived'::sit_status)
      AND s.end_date IS NOT NULL
      AND s.end_date < CURRENT_DATE
      AND EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.sit_id = s.id AND a.status = 'accepted'
      )
  )
  SELECT
    (SELECT count(*) FROM public.profiles)::bigint AS total_inscrits,
    (SELECT count(*) FROM gardes_realisees)::bigint AS maisons_gardees,
    (SELECT count(*) FROM public.small_missions WHERE status = 'completed'::small_mission_status)::bigint AS missions_entraide,
    (SELECT count(p.id)
       FROM gardes_realisees g
       JOIN public.pets p ON p.property_id = g.property_id)::bigint AS animaux_accompagnes;
$function$;