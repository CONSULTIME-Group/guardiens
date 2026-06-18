
-- Réoctroie aux anon les nouvelles colonnes publiques (view_count, rating_avg, rating_count)
GRANT SELECT (
  view_count, rating_avg, rating_count
) ON public.pro_profiles TO anon;

-- Fonction publique pour la carte : coordonnées arrondies (~100m) pour éviter le tracking précis
CREATE OR REPLACE FUNCTION public.get_pro_map_points()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  raison_sociale TEXT,
  category TEXT,
  city TEXT,
  urgences_24_7 BOOLEAN,
  lat NUMERIC,
  lng NUMERIC,
  rating_avg NUMERIC,
  rating_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.slug,
    p.raison_sociale,
    p.category,
    p.city,
    p.urgences_24_7,
    ROUND(p.latitude::numeric, 3) AS lat,
    ROUND(p.longitude::numeric, 3) AS lng,
    p.rating_avg,
    p.rating_count
  FROM public.pro_profiles p
  WHERE p.status = 'approved'
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.get_pro_map_points() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pro_map_points() TO anon, authenticated;
