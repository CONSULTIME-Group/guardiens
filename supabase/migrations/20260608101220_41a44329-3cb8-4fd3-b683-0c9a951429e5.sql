-- Quick wins: meta_title <=60 + meta_description 140-155

UPDATE public.articles SET meta_title = 'Réseau d''entraide Lyon : créer du lien près de chez vous', seo_dirty_at = now() WHERE slug = 'reseau-entraide-quartier-lyon-aura';
UPDATE public.articles SET meta_title = 'House-sitting Caluire-et-Cuire : gardiens vérifiés', seo_dirty_at = now() WHERE slug = 'house-sitting-caluire-et-cuire';
UPDATE public.articles SET meta_title = 'Pet sitting Lyon : garde d''animaux sans frais', seo_dirty_at = now() WHERE slug = 'pet-sitting-lyon-guide-complet';
UPDATE public.articles SET meta_title = 'House sitting Saint-Étienne : garde d''animaux Loire', seo_dirty_at = now() WHERE slug = 'house-sitting-saint-etienne-guide';
UPDATE public.articles SET meta_title = 'Garde de chien Lyon : comparatif et solutions', seo_dirty_at = now() WHERE slug = 'garde-chien-lyon-solutions';
UPDATE public.articles SET meta_title = 'Pet sitting Clermont-Ferrand : garde d''animaux Auvergne', seo_dirty_at = now() WHERE slug = 'pet-sitting-clermont-ferrand-guide';
UPDATE public.articles SET meta_title = 'Pet sitting Grenoble : garde d''animaux au pied des Alpes', seo_dirty_at = now() WHERE slug = 'pet-sitting-grenoble-guide';
UPDATE public.articles SET meta_title = 'Pet-sitting Chambéry Savoie : garde de confiance (73)', seo_dirty_at = now() WHERE slug = 'pet-sitting-chambery-savoie';
UPDATE public.articles SET meta_title = 'Tarifs Guardiens 2026 : gratuit propriétaires, 6,99 €/mois', seo_dirty_at = now() WHERE slug = 'nouveaux-tarifs-2026';
UPDATE public.articles SET meta_title = 'Pet-sitting Valence Drôme (26) : garde d''animaux', seo_dirty_at = now() WHERE slug = 'pet-sitting-valence-drome';
UPDATE public.articles SET meta_title = 'House-sitting été : préparer son départ en vacances', seo_dirty_at = now() WHERE slug = 'house-sitting-ete-aura-guide';
UPDATE public.articles SET meta_title = 'Pet-sitting Villeurbanne (69100) : Gratte-Ciel', seo_dirty_at = now() WHERE slug = 'pet-sitting-villeurbanne';
UPDATE public.articles SET meta_title = 'Pet sitting Annecy : garde d''animaux au bord du lac', seo_dirty_at = now() WHERE slug = 'pet-sitting-annecy-guide';
UPDATE public.articles SET meta_title = 'Le Berger Australien : caractère et conseils de garde', seo_dirty_at = now() WHERE slug = 'berger-australien-guide';
UPDATE public.articles SET meta_title = 'House sitting : guide complet 2026 (prix, France)', seo_dirty_at = now() WHERE slug = 'c-est-quoi-le-house-sitting';
UPDATE public.articles SET meta_title = 'Le Golden Retriever : caractère et conseils de garde', seo_dirty_at = now() WHERE slug = 'golden-retriever-lyon-guide-race';
UPDATE public.articles SET meta_title = 'Notre histoire : du pet sitting Argentine à Guardiens', seo_dirty_at = now() WHERE slug = 'notre-histoire-pet-sitting-argentine-lyon';
UPDATE public.articles SET meta_title = 'Gardiennage maison vacances : sécurité et tranquillité', seo_dirty_at = now() WHERE slug = 'gardiennage-maison-vacances-aura';
UPDATE public.articles SET meta_title = 'House-sitting France : juridique, assurance, responsabilité', seo_dirty_at = now() WHERE slug = 'house-sitting-cadre-juridique-france';

-- Meta descriptions trop courtes -> plage 140-155
UPDATE public.articles SET meta_description = 'Garde d''animaux à Vénissieux et Parilly : trouvez un gardien de confiance dans le sud lyonnais avec Guardiens, sans frais et près de chez vous.', seo_dirty_at = now() WHERE slug = 'pet-sitting-venissieux';
UPDATE public.articles SET meta_description = 'Garde d''animaux à Villeurbanne (Gratte-Ciel, Charpennes, Cusset) : trouvez un gardien de confiance sans frais avec Guardiens, près de chez vous.', seo_dirty_at = now() WHERE slug = 'pet-sitting-villeurbanne';
UPDATE public.articles SET meta_description = 'House-sitting de standing à Aix-les-Bains : garde de villa et d''animaux au bord du Lac du Bourget avec Guardiens, gardiens locaux vérifiés.', seo_dirty_at = now() WHERE slug = 'house-sitting-aix-les-bains';
UPDATE public.articles SET meta_description = 'Pet sitting à Clermont-Ferrand : gardez des animaux au pied des volcans d''Auvergne. Service sans frais avec gardiens locaux vérifiés sur Guardiens.', seo_dirty_at = now() WHERE slug = 'pet-sitting-clermont-ferrand-guide';