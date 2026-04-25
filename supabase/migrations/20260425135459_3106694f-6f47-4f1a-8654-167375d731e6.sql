-- 1) Restrictive policy: admins (and any other role) cannot SELECT individual application rows.
--    Owner & sitter access remain via the existing PERMISSIVE policy.
--    A RESTRICTIVE policy is ANDed with permissive ones, so this denies admin row-level reads
--    even if a future permissive admin policy is added by mistake.
DROP POLICY IF EXISTS "Block direct admin row reads on applications" ON public.applications;

CREATE POLICY "Block direct admin row reads on applications"
ON public.applications
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  -- Allow only the two legitimate row-level readers: the sitter and the sit owner.
  -- Admins fall through to false here, forcing them to use aggregated RPCs.
  auth.uid() = sitter_id
  OR EXISTS (
    SELECT 1 FROM public.sits s
    WHERE s.id = applications.sit_id
      AND s.user_id = auth.uid()
  )
);

-- 2) Aggregated RPC for admin listing pages — counts only, no row exposure.
CREATE OR REPLACE FUNCTION public.admin_get_listings_application_counts(p_sit_ids uuid[])
RETURNS TABLE(sit_id uuid, app_count integer, pending_app_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  SELECT
    a.sit_id,
    COUNT(*) FILTER (WHERE a.status NOT IN ('rejected', 'cancelled'))::integer AS app_count,
    COUNT(*) FILTER (WHERE a.status IN ('pending', 'viewed', 'discussing'))::integer AS pending_app_count
  FROM public.applications a
  WHERE a.sit_id = ANY(p_sit_ids)
  GROUP BY a.sit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_listings_application_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_listings_application_counts(uuid[]) TO authenticated;