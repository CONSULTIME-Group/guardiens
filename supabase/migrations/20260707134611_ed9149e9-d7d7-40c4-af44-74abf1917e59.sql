-- Hide updated_by (admin UUID) from Realtime broadcasts and public reads.
-- The rest of hero_weights stays public (config weights read by everyone).

-- 1. Restrict Realtime publication to config columns only (drop then re-add with column list).
ALTER PUBLICATION supabase_realtime DROP TABLE public.hero_weights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hero_weights
  (id, weight_animals, weight_home, weight_mutual_aid, weight_village, updated_at);

-- 2. Revoke column-level SELECT on updated_by from anon and authenticated
--    so the Data API / PostgREST cannot expose it either. Admins keep access
--    via service_role and RLS on other paths.
REVOKE SELECT (updated_by) ON public.hero_weights FROM anon, authenticated;
