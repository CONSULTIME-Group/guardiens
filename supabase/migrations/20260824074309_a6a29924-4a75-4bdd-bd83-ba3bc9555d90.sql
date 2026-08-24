CREATE OR REPLACE FUNCTION public.get_content_stats(p_city_slug text DEFAULT NULL, p_department_slug text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH global_stats AS (
    SELECT jsonb_build_object(
      'total_inscrits', (SELECT count(*) FROM profiles),
      'profils_gardien', (SELECT count(*) FROM profiles WHERE role IN ('sitter', 'both')),
      'profils_proprio', (SELECT count(*) FROM profiles WHERE role IN ('owner', 'both')),
      'inscrits_30j', (SELECT count(*) FROM profiles WHERE created_at >= now() - interval '30 days'),
      'city_guides', (SELECT count(*) FROM city_guides WHERE published),
      'city_guide_places', (SELECT count(*) FROM city_guide_places p JOIN city_guides g ON g.id = p.city_guide_id WHERE g.published),
      'breed_profiles', (SELECT count(*) FROM breed_profiles),
      'villes_couvertes', (SELECT count(*) FROM seo_city_pages WHERE published AND NOT COALESCE(noindex, false) AND slug NOT LIKE 'test-%'),
      'departements_couverts', (SELECT count(*) FROM seo_department_pages WHERE published AND NOT COALESCE(noindex, false))
    ) AS g
  ),
  city_stats AS (
    SELECT jsonb_build_object(
      'ville_nom', c.city,
      'ville_departement', c.department,
      'ville_gardiens', c.sitter_count,
      'ville_gardiens_proximite', c.nearby_sitter_count,
      'ville_gardiens_total', COALESCE(c.sitter_count, 0) + COALESCE(c.nearby_sitter_count, 0),
      'ville_annonces_actives', c.active_sits_count
    ) AS v
    FROM seo_city_pages c
    WHERE p_city_slug IS NOT NULL AND c.slug = p_city_slug AND c.published
    LIMIT 1
  ),
  dept_stats AS (
    SELECT jsonb_build_object(
      'departement_nom', d.department,
      'departement_gardiens', d.sitter_count,
      'departement_annonces_actives', d.active_sits_count
    ) AS v
    FROM seo_department_pages d
    WHERE p_department_slug IS NOT NULL AND d.slug = p_department_slug AND d.published
    LIMIT 1
  )
  SELECT (SELECT g FROM global_stats)
    || COALESCE((SELECT v FROM city_stats), '{}'::jsonb)
    || COALESCE((SELECT v FROM dept_stats), '{}'::jsonb);
$$;

COMMENT ON FUNCTION public.get_content_stats(text, text) IS 'Variables dynamiques du contenu éditorial (placeholders {{...}}). Les chiffres ville/département sont lus dans les colonnes existantes de seo_city_pages / seo_department_pages, jamais recalculés, pour rester cohérents avec les compteurs affichés sur les mêmes pages.';

GRANT EXECUTE ON FUNCTION public.get_content_stats(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_content_stats(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_stats(text, text) TO service_role;