-- Lot CPT1 (17/10/2026) : le compteur public « inscrits » exclut les comptes
-- supprimés, même règle que l'admin (NOT_DELETED_FILTER, lot A10).
-- Constat du 17/10/2026 : 1 656 à l'accueil, 1 643 comptes non supprimés.
-- Base : définition en production le 17/10/2026 (md5 0d2d3c18), seule la
-- ligne total_inscrits change. Droits inchangés (visiteurs compris). Rejouable.
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
    (SELECT count(*) FROM public.profiles p
      WHERE p.account_status IS NULL OR p.account_status::text <> 'deleted')::bigint AS total_inscrits,
    (SELECT count(*) FROM gardes_realisees)::bigint AS maisons_gardees,
    (SELECT count(*) FROM public.small_missions WHERE status <> 'cancelled'::small_mission_status)::bigint AS missions_entraide,
    (SELECT count(p.id)
       FROM gardes_realisees g
       JOIN public.pets p ON p.property_id = g.property_id)::bigint AS animaux_accompagnes;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated, service_role;
