
DROP VIEW IF EXISTS public.v_email_pipeline_health;

CREATE VIEW public.v_email_pipeline_health
WITH (security_invoker = true) AS
  SELECT * FROM public.get_email_pipeline_health();

REVOKE ALL ON public.v_email_pipeline_health FROM public, anon;
GRANT SELECT ON public.v_email_pipeline_health TO authenticated, service_role;
