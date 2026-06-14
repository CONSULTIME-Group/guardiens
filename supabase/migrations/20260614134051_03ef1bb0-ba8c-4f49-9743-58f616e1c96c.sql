-- Delete forbidden Long Stay article (concept permanently removed from product)
DELETE FROM public.articles WHERE slug = 'gardes-longue-duree-guide';

-- Rename forbidden AURA slug to neutral one
UPDATE public.articles
SET slug = 'demenagement-entraide-locale-france'
WHERE slug = 'demenagement-entraide-locale-aura';

-- Publish 4 clean articles
UPDATE public.articles
SET published = true, published_at = COALESCE(published_at, now())
WHERE slug IN (
  'devenir-pet-sitter-guide-debutant',
  'pet-sitting-lyon-ouest-lyonnais',
  'boom-pet-sitting-lyon-2026',
  'demenagement-entraide-locale-france'
);