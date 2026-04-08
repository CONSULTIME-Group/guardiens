DROP VIEW IF EXISTS public.public_stats;

CREATE VIEW public.public_stats
WITH (security_invoker=on) AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles) AS total_inscrits,
  (SELECT COUNT(*) FROM public.sits WHERE status = 'completed') AS maisons_gardees,
  (SELECT COUNT(*) FROM public.small_missions WHERE status = 'completed') AS missions_entraide;

GRANT SELECT ON public.public_stats TO anon;
GRANT SELECT ON public.public_stats TO authenticated;