# LOT E7, la page Entraide vue d'un membre

Objectif : sur `/petites-missions`, un membre connecté voit d'abord les besoins les plus proches de chez lui, classés par distance, avec un bouton « Je peux » sur chaque ligne, et la page charge un nombre fixe de requêtes.

## Ce qui change pour le membre connecté

1. En-tête compact : H1 « Besoins près de chez vous », sous-titre « Autour de {ville du profil}. Le plus proche est à {d} km. », origine prise automatiquement dans les coordonnées du profil. Sans coordonnées : « Indiquez votre ville pour voir les besoins les plus proches. » avec le champ ville. Lien discret « Changer de lieu » qui révèle le champ ville et un bouton « Afficher ». Le bouton « Situer » disparaît.
2. Deux actions : bouton principal « Demander un coup de main » ; puis, si `available_for_help` vaut vrai, la phrase « Vous êtes disponible pour aider. Vous recevez les besoins publiés près de chez vous. » avec un lien « Modifier », sinon le bouton secondaire « Me rendre disponible pour aider » (comportement `goHelp` actuel, sans la bascule d'onglet).
3. Bascule « Liste | Carte », liste par défaut partout, mobile et ordinateur, connecté ou non.
4. Liste compacte triée par distance : vignette 72 px (première photo, sinon pastille couleur secondaire avec l'initiale de la catégorie), titre, « à {d} km, {ville} », date ou « À convenir ensemble », nombre de « Je peux » s'il dépasse zéro, et à droite le bouton « Je peux ». La ligne entière ouvre le détail. Deux lignes de texte maximum sur mobile. États : « Votre besoin » pour un besoin publié par le membre, « Vous avez dit je peux » quand la réponse existe déjà.
5. Si le besoin le plus proche dépasse 30 km, un encart au-dessus de la liste : « Le premier besoin de votre secteur peut être le vôtre. » avec le bouton « Demander un coup de main ».
6. Carte : besoins en pastilles couleur secondaire, personnes disponibles en petits points, légende « Besoins » et « Personnes disponibles », couleurs identiques quelle que soit la vue, centrage sur l'origine au zoom ville.
7. Section « Prêts à aider près de chez vous » : les 12 personnes disponibles les plus proches et un bouton « Voir 12 de plus ». L'onglet « Autour de vous » et la recherche par prénom disparaissent.
8. En bas, inchangés : preuves, liens de villes, bloc CRÉDOC, FAQ.

## Visiteur non connecté

En-tête éditorial actuel conservé (H1 question, manifeste, « Concrètement », « Comment ça marche »), puis la même liste compacte par défaut (origine = ville saisie, sinon tri par date), la même section de 12 personnes, puis preuves, villes, CRÉDOC, FAQ. Son bouton « Je peux » mène vers `/inscription?redirect=` suivi de l'adresse encodée du besoin.

## Pour tous

Les 727 fiches Person du JSON-LD sont retirées, la FAQPage reste. La description de page est réécrite sans le mot proscrit : « Trouvez un coup de main près de chez vous, ou proposez le vôtre aux membres du coin. »

## Détails techniques

Fichiers modifiés :
- `src/pages/EntraideHub.tsx` : nouvelle composition, origine issue du profil, suppression de l'onglet, du champ de recherche, du bouton « Situer » et des schémas Person.
- `src/components/entraide/EntraideCards.tsx` : ajout de `NeedRow` (ligne compacte) et `HelperCard` allégée qui reçoit compteurs et écussons en props au lieu de les charger.
- `src/components/entraide/EntraideMap.tsx` : couleurs fixes par famille (besoins en `--secondary`, personnes en `--muted-foreground`), légende, plus de rôle inversé selon l'onglet, centrage sur l'origine.
- `src/components/entraide/HelpCounts.tsx` : `helpCountsLabel` conservé, la lecture par carte est retirée ; le composant devient un affichage pur.
- `src/components/missions/MissionBadgesReceived.tsx` : ajout d'une prop facultative `rows` qui court-circuite la requête quand les écussons arrivent déjà chargés. Les usages existants (profil public, cartes de réponse) restent identiques.
- Nouveau `src/lib/missionRespond.ts` : la fonction de réponse partagée.
- Nouveau `src/lib/entraideHubModel.ts` : tri par distance, seuil des 30 km, sélection des 12 personnes, logique pure testée.
- `src/pages/MissionsCityPage.tsx` : adaptation aux nouvelles props de `HelperCard` (même rendu, chargement groupé).

Fonction de réponse réutilisée : la page détail porte aujourd'hui `handleRespond` en local dans `src/pages/SmallMissionDetail.tsx` (ligne 391), appelée par le bouton « Je peux » existant avec le message « Je peux vous aider. ». Elle est extraite telle quelle dans `src/lib/missionRespond.ts` sous le nom `respondToMission`, avec les mêmes contrôles : relecture de l'état du besoin, refus sur son propre besoin, message minimal de 10 caractères, doublon 23505, `account_not_active`, `mission_response_cap_reached`. `SmallMissionDetail.tsx` l'appelle ensuite au lieu de sa copie locale, et la liste du hub appelle la même fonction. C'est la seule modification de comportement partagé du lot : je la signale avant de l'écrire, elle est nécessaire pour respecter « même fonction, mêmes contrôles ».

Requêtes groupées prévues au chargement :
- besoins ouverts (`public_small_missions`), personnes disponibles (`public_helpers`), compteurs de réponses (`public_mission_response_counts`), preuves (`public_entraide_proofs`) : inchangées.
- membre connecté : une lecture de son profil (`city, latitude, longitude, available_for_help`) et une lecture de ses réponses (`small_mission_responses` filtré sur `responder_id`).
- section des personnes : `public_help_counts` et `profile_mission_badges` chargées en une requête chacune avec `.in("user_id", idsAffichés)`, sur les seules personnes visibles.

Requêtes réseau au chargement : environ 1 458 aujourd'hui pour un membre (4 requêtes de page plus deux par fiche sur 727 fiches), 8 après, quel que soit le nombre de personnes affichées. Le bouton « Voir 12 de plus » ajoute deux requêtes groupées par palier.

Aucune migration n'est nécessaire : toutes les colonnes utilisées existent déjà (`public_small_missions.user_id` et `category`, `profiles.latitude/longitude/city/available_for_help`, vues `public_help_counts` et `profile_mission_badges`), et la lecture de ses propres réponses est déjà autorisée.

## Tests

Nouveau `src/pages/__tests__/entraide-hub-e7.test.tsx` et `src/__tests__/entraide-hub-model.test.ts` :
- origine prise dans le profil connecté, sans saisie de ville ;
- liste affichée par défaut à 1440 px et à 360 px ;
- tri des besoins par distance croissante ;
- bouton « Je peux » branché sur `respondToMission`, états « Votre besoin » et « Vous avez dit je peux » ;
- message au-delà de 30 km ;
- légende de carte présente avec les deux familles ;
- au plus trois requêtes pour la section des personnes (liste, compteurs, écussons) ;
- absence de schéma Person dans le JSON-LD ;
- scan des textes : aucun tiret cadratin ni demi-cadratin, aucune construction négative, mot proscrit absent.

`src/pages/__tests__/entraide-hub-explicit.test.tsx` est mis à jour : la vérification « garde un JSON-LD Person » devient l'inverse, et le test de recherche par prénom est retiré avec la fonction.

Aucune publication, aucun redéploiement de fonction.
