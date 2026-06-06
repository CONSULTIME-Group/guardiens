UPDATE public.articles SET
  excerpt = REPLACE(REPLACE(REPLACE(excerpt, ' — ', ', '), '— ', ', '), '—', ','),
  content = REPLACE(REPLACE(REPLACE(content, ' — ', ', '), '— ', ', '), '—', ','),
  meta_title = REPLACE(REPLACE(REPLACE(meta_title, ' — ', ', '), '— ', ', '), '—', ','),
  meta_description = REPLACE(REPLACE(REPLACE(meta_description, ' — ', ', '), '— ', ', '), '—', ','),
  hero_image_alt = REPLACE(REPLACE(REPLACE(hero_image_alt, ' — ', ', '), '— ', ', '), '—', ',')
WHERE excerpt LIKE '%—%' OR content LIKE '%—%' OR meta_title LIKE '%—%'
   OR meta_description LIKE '%—%' OR hero_image_alt LIKE '%—%';

UPDATE public.avis_publics SET
  comment = REPLACE(REPLACE(REPLACE(comment, ' — ', ', '), '— ', ', '), '—', ',')
WHERE comment LIKE '%—%';