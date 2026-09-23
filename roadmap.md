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
