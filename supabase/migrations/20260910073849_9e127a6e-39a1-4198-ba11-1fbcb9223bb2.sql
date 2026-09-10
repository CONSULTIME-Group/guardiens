ALTER TABLE public.seasonal_nurture_incidents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.seasonal_nurture_incidents FROM anon;
GRANT SELECT ON public.seasonal_nurture_incidents TO authenticated;
GRANT ALL ON public.seasonal_nurture_incidents TO service_role;

CREATE POLICY "Admins can read seasonal nurture incidents"
ON public.seasonal_nurture_incidents
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));