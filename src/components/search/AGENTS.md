# Décisions techniques, recherche

- Recherche de gardiens (lot 1 international) : vivier lu en entier par la RPC search_sitter_pool (pays filtré côté serveur, pages de 1 000, même population que search_sitter_country_counts), zones, suggestions par pays et cadrage de carte dans src/lib/sitterSearch.ts ; pourquoi : la tranche de 500 profils faisait disparaître des gardiens et les compteurs ne comptaient pas la même population.
