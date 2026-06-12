
-- Drop the view that triggered SECURITY DEFINER linter
DROP VIEW IF EXISTS public.pro_profiles_public;

-- Restore the public SELECT policy on the base table
DROP POLICY IF EXISTS "Public can view approved pro profiles" ON public.pro_profiles;
CREATE POLICY "Public can view approved pro profiles"
  ON public.pro_profiles
  FOR SELECT
  TO public
  USING (status = 'approved'::pro_moderation_status);

-- Column-level revocation: anonymous visitors cannot read SIRET
REVOKE SELECT (siret) ON public.pro_profiles FROM anon;
