-- Fix "arroser plantes" articles: replace pet photos with plant/garden images
UPDATE articles SET cover_image_url = 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1200'
WHERE slug = 'arroser-plantes-vacances-grenoble';

UPDATE articles SET cover_image_url = 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=1200'
WHERE slug = 'arroser-plantes-vacances-lyon';

UPDATE articles SET cover_image_url = 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200'
WHERE slug = 'arroser-plantes-vacances-annecy';

-- Fix "jardinage entre voisins" articles: replace dog/friend photos with gardening images
UPDATE articles SET cover_image_url = 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=1200'
WHERE slug = 'jardinage-echange-service-voisin-grenoble';

UPDATE articles SET cover_image_url = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200'
WHERE slug = 'jardinage-echange-service-voisin-lyon';

UPDATE articles SET cover_image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200'
WHERE slug = 'jardinage-echange-service-voisin-annecy';

-- Fix bricolage article
UPDATE articles SET cover_image_url = 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=1200'
WHERE slug = 'bricolage-montage-meubles-voisin-grenoble-lyon';