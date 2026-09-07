CREATE OR REPLACE VIEW public.public_sitter_gallery_counts AS
SELECT user_id, count(*)::int AS photo_count
FROM public.sitter_gallery
GROUP BY user_id;

GRANT SELECT ON public.public_sitter_gallery_counts TO anon, authenticated;

COMMENT ON VIEW public.public_sitter_gallery_counts IS 'Nombre de photos de galerie par gardien, exposé publiquement. Aucune URL de photo n''est servie. Utilisé pour le calcul d''indexabilité SEO (page fiche gardien et generate-sitemap).';