# Filtre proximité sur EntraideHub

## Contexte
`EntraideHub` charge aujourd'hui les 120 missions ouvertes les plus récentes, sans géoloc ni tri distance. Le silo « près de chez vous » n'est donc pas tenu. Objectif : rendre la proximité opérationnelle sans casser l'expérience visiteur non-connecté.

## Décisions à confirmer (2 questions)

1. **Source de position** :
   - a) Code postal du profil (par défaut si connecté), avec fallback saisie manuelle « Autour de [CP] » pour visiteurs.
   - b) API géoloc navigateur (prompt), fallback CP.
   - c) Les deux : CP profil par défaut, bouton « Utiliser ma position » optionnel.
2. **Rayon** : 15, 30, 50 km — un seul rayon par défaut ou sélecteur ?

Recommandation : **1c + sélecteur 15 / 30 / 50 / 100 km, défaut 30 km**, cohérent avec la mémoire `mutual-aid-ux-v2`.

## Périmètre

- Ajouter un `PostalInput` compact (chip « Autour de [CP] ») dans la barre de filtres, à côté du sélecteur catégorie.
- Sur profil connecté avec `postal_code`, pré-remplir. Sur visiteur, chip vide → « Où êtes-vous ? ».
- Ajouter un `Select` rayon (15/30/50/100 km).
- Ajouter un tri « Proche d'abord » (via haversine côté client) en 3e option (récent / date besoin / proximité).
- Filtrer côté client : n'afficher que les missions dont la distance ≤ rayon, sinon message vide dédié.

## Impl technique

- Réutiliser `src/lib/geo/haversine.ts` (existe déjà via SearchSitter).
- Résoudre CP → lat/lng via `geocode_cache` (table existante).
- Persister CP + rayon dans `localStorage` (`entraide.postal`, `entraide.radius`).
- Ne pas géocoder à chaque render : mémo `useMemo` sur `[postal, radius, missions]`.
- Fallback gracieux : si CP invalide, désactiver le tri distance et afficher un tooltip.
- Ajouter analytics : `entraide.filter.proximity_used`.

## Fichiers touchés

- `src/pages/EntraideHub.tsx` (barre de filtres + tri + affichage distance).
- Nouveau : `src/components/missions/ProximityFilter.tsx` (chip CP + rayon).
- `src/hooks/useMissionDistance.ts` (résolution CP → coords + calcul distance).

## Hors périmètre

- Pas de refonte de la carte / vue map.
- Pas de push notifications sur nouvelles missions proches (déjà couvert par `alert_preferences`).
- Pas de changement DB.

## Effort estimé

3-4 h dev + QA mobile/desktop.
