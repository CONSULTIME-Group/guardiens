UPDATE public.articles
SET internal_links = '[
  {"url":"/actualites/proprietaire-preparer-garde-maison","text":"Comment bien préparer sa garde de maison"},
  {"url":"/tarifs","text":"Tarifs Guardiens et gratuité propriétaire"},
  {"url":"/annonces/international","text":"Voir les annonces internationales"},
  {"url":"/actualites/gardiennage-maison-vacances-aura","text":"Gardiennage de maison pendant les vacances"},
  {"url":"/actualites/expat-proprietaire-faire-garder-maison-etranger","text":"Vous vivez à l''étranger ? Faites garder votre maison là-bas par un Français"}
]'::jsonb,
updated_at = now()
WHERE slug = 'francais-etranger-garde-maison-france';

UPDATE public.articles
SET internal_links = '[
  {"url":"/actualites/francais-etranger-garde-maison-france","text":"L''angle inverse : faire garder sa maison en France depuis l''étranger"},
  {"url":"/actualites/proprietaire-preparer-garde-maison","text":"Comment bien préparer sa garde de maison"},
  {"url":"/tarifs","text":"Tarifs Guardiens : espace propriétaire gratuit"},
  {"url":"/annonces/international","text":"Voir toutes les annonces internationales"}
]'::jsonb,
updated_at = now()
WHERE slug = 'expat-proprietaire-faire-garder-maison-etranger';