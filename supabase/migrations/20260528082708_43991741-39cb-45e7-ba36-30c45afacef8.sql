-- Restrict public reads on internal operational tables
DROP POLICY IF EXISTS "Steps readable" ON public.nurturing_steps;
CREATE POLICY "Steps readable by admins"
  ON public.nurturing_steps
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.nurturing_steps FROM anon;

DROP POLICY IF EXISTS config_select_public ON public.reputation_config;
CREATE POLICY config_select_authenticated
  ON public.reputation_config
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.reputation_config FROM anon;