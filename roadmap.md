# Roadmap

## Lot E7, page Entraide vue d'un membre

- [ ] Extraire `respondToMission` dans `src/lib/missionRespond.ts` et brancher `SmallMissionDetail.tsx` dessus
- [ ] Logique pure `src/lib/entraideHubModel.ts` (tri distance, seuil 30 km, sélection des 12 personnes)
- [ ] Ligne compacte `NeedRow` et `HelperCard` alimentée par props dans `EntraideCards.tsx`
- [ ] Chargement groupé des compteurs et écussons (`.in`), `HelpCounts` en affichage pur, prop `rows` sur `MissionBadgesReceived`
- [ ] Refonte `EntraideHub.tsx` : origine profil, en-tête compact, liste par défaut, section 12 personnes, JSON-LD sans Person, meta description
- [ ] Carte : besoins en `--secondary`, personnes en `--primary`, légende, centrage origine
- [ ] Adapter `MissionsCityPage.tsx` aux nouvelles props
- [ ] Tests ciblés E7 + mise à jour `entraide-hub-explicit.test.tsx`
- [ ] Vitest complet, tsgo, build, scan des textes
- [ ] Mesure des requêtes réseau au chargement, membre connecté, avant et après
- [ ] Rapport final 10 lignes avec hash du commit (aucune publication, aucune migration)
