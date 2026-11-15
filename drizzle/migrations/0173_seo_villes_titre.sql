-- Lot SEO-V1 (15/11/2026, onglet SEO et IA de /admin/traffic, « ok go suis tes reco » de Jérémie) :
-- les 160 pages villes portaient un meta title « Home sitter à {ville} : ... ». Pour la
-- requête générique « home sitter » (1 743 impressions, position 18,5, 16/10 au 13/11/2026),
-- Google faisait ressortir une page ville au hasard (/house-sitting/valence). Les pages
-- villes prennent le gabarit des pages d'outre-mer, « Garde de maison et d'animaux à {ville} »,
-- et laissent « home sitter » à l'article définition (c-est-quoi-le-house-sitting).
-- Les descriptions et le texte des pages, qui citent le home sitter de la ville, restent.
-- Le déclencheur seo_city_pages_content_date avance content_updated_at (lastmod du sitemap).
-- Rejouable : la condition ne retient plus aucune ligne une fois passée. Repère : seo_villes_titre.

UPDATE public.seo_city_pages
SET meta_title = 'Garde de maison et d''animaux à ' || substring(meta_title from '^Home sitter à (.+?) : ')
WHERE meta_title LIKE 'Home sitter à % : %'
  AND substring(meta_title from '^Home sitter à (.+?) : ') IS NOT NULL;
