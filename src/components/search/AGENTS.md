# Décisions techniques, recherche

- Recherche de gardiens (lot 1 international) : vivier lu en entier par la RPC search_sitter_pool (pays filtré côté serveur, pages de 1 000, même population que search_sitter_country_counts), zones, suggestions par pays et cadrage de carte dans src/lib/sitterSearch.ts ; pourquoi : la tranche de 500 profils faisait disparaître des gardiens et les compteurs ne comptaient pas la même population.

- Mobilité géographique (lot 2) : sitter_profiles.travel_zones (jetons local, region:FR-XXX, country:XX, continent:XX, world ; NULL = non renseignée), règles uniques dans src/lib/travelZones.ts, « Peuvent venir ici » lu par search_sitter_pool_mobile puis filtré par canComeTo ; un jeu brut dont la clé (pays, mode, région) diffère de la recherche courante n'est jamais affiché ; pourquoi : aucun opt-in implicite et aucun résultat périmé d'un autre pays.
