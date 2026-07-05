
REVOKE ALL ON FUNCTION public.calculate_affinity_score_pg(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_affinity_score_pg(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.notify_sitters_on_new_sit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_sitters_on_new_sit() TO service_role;

REVOKE ALL ON FUNCTION public.haversine_km(double precision, double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.haversine_km(double precision, double precision, double precision, double precision) TO authenticated, service_role;
