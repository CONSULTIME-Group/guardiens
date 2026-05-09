DROP FUNCTION IF EXISTS public.get_public_stats();

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(
  total_inscrits bigint,
  maisons_gardees bigint,
  missions_entraide bigint,
  animaux_accompagnes bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles)::bigint AS total_inscrits,
    (SELECT count(*) FROM public.sits WHERE status = 'completed'::sit_status)::bigint AS maisons_gardees,
    (SELECT count(*) FROM public.small_missions WHERE status = 'completed'::small_mission_status)::bigint AS missions_entraide,
    (SELECT count(p.id)
       FROM public.sits s
       JOIN public.properties pr ON pr.id = s.property_id
       JOIN public.pets p ON p.property_id = pr.id
      WHERE s.status = 'completed'::sit_status)::bigint AS animaux_accompagnes;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;