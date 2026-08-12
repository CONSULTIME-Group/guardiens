UPDATE public.articles
SET content = replace(
  content,
  'Sur Guardiens, une annonce sur cinq ne porte aucun animal. Pendant longtemps, ça bloquait la publication. Ce n''est plus le cas.',
  'Sur Guardiens, un logement sur cinq n''a aucun animal enregistré. Pendant longtemps, ça empêchait de publier une annonce. Ce n''est plus le cas.'
)
WHERE slug = 'garder-une-maison-ce-n-est-pas-garder-un-animal';