-- Lot ANN-1 (16/11/2026) : page Annonces de l'admin triée par urgence.
-- Pour chaque annonce : candidatures qui attendent une réponse (pending, viewed,
-- discussing) et date de la plus ancienne. Lecture seule, admin seulement.
CREATE OR REPLACE FUNCTION public.admin_get_listings_waiting(p_sit_ids uuid[])
RETURNS TABLE(sit_id uuid, waiting_count bigint, oldest_waiting_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- ann1_listings_waiting
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;
  RETURN QUERY
  SELECT u.id,
         COUNT(a.id)::bigint,
         MIN(a.created_at)
  FROM unnest(p_sit_ids) AS u(id)
  LEFT JOIN public.applications a
    ON a.sit_id = u.id AND a.status IN ('pending', 'viewed', 'discussing')
  GROUP BY u.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_listings_waiting(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_listings_waiting(uuid[]) TO authenticated;
