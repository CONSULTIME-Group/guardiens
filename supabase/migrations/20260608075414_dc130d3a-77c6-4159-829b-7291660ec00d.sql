UPDATE articles
SET content = REPLACE(content, '3 formules', 'plusieurs options')
WHERE slug = 'nouveaux-tarifs-2026';

UPDATE articles
SET content = REPLACE(content, '/actualites/demenagement-entraide-locale-aura', '/actualites/petites-missions-entraide-guide')
WHERE slug = 'petites-missions-entraide-guardiens';

UPDATE articles
SET content = REPLACE(content, '/actualites/pet-sitting-lyon-ouest-lyonnais', '/actualites/petites-missions-entraide-guide')
WHERE slug = 'pet-sitting-lyon-guide-complet';