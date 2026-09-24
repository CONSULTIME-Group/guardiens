# Roadmap

## Lot E7, page Entraide vue d'un membre

- [x] Extraire `respondToMission` dans `src/lib/missionRespond.ts` et brancher `SmallMissionDetail.tsx` dessus
- [x] Logique pure `src/lib/entraideHubModel.ts` (tri distance, seuil 30 km, sélection des 12 personnes)
- [x] Ligne compacte `NeedRow` et `HelperCard` alimentée par props dans `EntraideCards.tsx`
- [x] Chargement groupé des compteurs et écussons (`.in`), `HelpCounts` en affichage pur, prop `rows` sur `MissionBadgesReceived`
- [x] Refonte `EntraideHub.tsx` : origine profil, en-tête compact, liste par défaut, section 12 personnes, JSON-LD sans Person, meta description
- [x] Carte : besoins en `--secondary`, personnes en `--primary`, légende, centrage origine
- [x] `MissionsCityPage.tsx` : props nouvelles facultatives, rendu inchangé, aucune modification nécessaire
- [x] Tests ciblés E7 + mise à jour `entraide-hub-explicit.test.tsx`
- [x] Vitest complet, tsgo, build, scan des textes
- [x] Mesure des requêtes réseau au chargement, membre connecté, avant et après
- [x] Rapport final 10 lignes avec hash du commit (aucune publication, aucune migration)

## Finition H1 et E7

- [x] Composer la home avec 4 gardes et 2 besoins, avec repli et tri local
- [x] Corriger le compteur national, le hero et le lien réservé aux visiteurs
- [x] Exclure le membre de la liste Entraide et ajuster distances et capitalisation
- [x] Adapter les tests et lancer toutes les vérifications demandées

## Régression du voile du hero

- [x] Rétablir le dégradé, les styles des textes et des boutons, et la mention presse temporaire
- [x] Vérifier le garde-fou, les types, le build et le contraste à 360 px et 1440 px

## Lot H2, accueil resserré et vérité sur la rencontre

- [ ] Corriger les formulations produit, SEO et structurées sur la rencontre conseillée
- [ ] Resserrer l'accueil à 9 ensembles et intégrer les coups de main au fonctionnement
- [ ] Condenser l'histoire, l'affinité et la définition, puis replier le comparatif
- [ ] Afficher 6 questions et monter les 3 autres dans un accordéon replié
- [ ] Vérifier les textes avant et après, les tests, les types, le build, la hauteur et le LCP
- [ ] Livrer le rapport final avec hash, sans migration ni publication
