CREATE OR REPLACE FUNCTION public.get_inventaire_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'cities_total', (SELECT count(*) FROM public.city_guides WHERE published = true),
    'places_total', (SELECT count(*) FROM public.city_guide_places p JOIN public.city_guides g ON g.id = p.city_guide_id WHERE g.published = true),
    'places_by_category', (
      SELECT COALESCE(jsonb_object_agg(category, cnt), '{}'::jsonb)
      FROM (
        SELECT p.category::text AS category, count(*) AS cnt
        FROM public.city_guide_places p
        JOIN public.city_guides g ON g.id = p.city_guide_id
        WHERE g.published = true
        GROUP BY p.category
      ) x
    ),
    'breeds_total', (SELECT count(*) FROM public.breed_profiles),
    'breeds_by_species', (
      SELECT COALESCE(jsonb_object_agg(species, cnt), '{}'::jsonb)
      FROM (SELECT species, count(*) AS cnt FROM public.breed_profiles GROUP BY species) x
    ),
    'pros_total', (SELECT count(*) FROM public.pro_profiles),
    'pros_verified', (SELECT count(*) FROM public.pro_profiles WHERE siret_verified = true),
    'pros_by_category', (
      SELECT COALESCE(jsonb_object_agg(category, cnt), '{}'::jsonb)
      FROM (SELECT category::text AS category, count(*) AS cnt FROM public.pro_profiles GROUP BY category) x
    ),
    'generated_at', now()
  );
$$;