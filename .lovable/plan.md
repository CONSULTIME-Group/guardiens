
# Audit /petites-missions (page connectée) — `SmallMissions.tsx`

## Constat

**Forces**
- Double mode "Demandes du coin / Personnes qui aident" cohérent.
- Filtres riches : code postal + rayon (1–100 km, France entière), recherche texte, catégories.
- Tri intelligent : missions correspondant aux compétences déclarées priorisées.
- Helpers triés en 2 blocs (compétences spécifiques vs catégorie seule).
- Empty states rédigés avec soin (vouvoiement, encouragement).
- Filtre catégorie déjà nettoyé des icônes Lucide (commentaire ligne 514).
- Dialog "Proposer mon aide" fluide avec autocomplete compétences.

**Faiblesses prioritaires**
1. **Monolithique 1182 lignes** : 4 useQuery + 8 useEffect + 3 dialogs + JSX géant dans un seul fichier. Maintenance pénible, re-renders coûteux.
2. **Icônes Lucide décoratives dans le contenu** (`Dog`, `Flower2`, `Handshake`, `Sprout`, `PawPrint`, `GraduationCap`, `Star`) sur cards missions, pills helpers, section "Exemples". **Viole la règle mémoire** « No Lucide/Emoji in content ».
3. **Géocodage côté client lourd** : 50 missions × 1 appel `geocodeCity` + 50 helpers idem. Lent au cold-start, coûte des appels Mapbox/Nominatim. Les colonnes `latitude/longitude` existent sur `small_missions`, pas exploitées en priorité ; les profils n'ont pas de coordonnées en BDD.
4. **`Schema.org Service` dupliqué** avec la page publique `/petites-missions` (risque de cannibalisation SEO). Page connectée → devrait être **noindex**.
5. **Hero image en URL hardcodée Supabase** (`erhccyqevdyevpyctsjj.supabase.co/...`) → fragile, pas optimisée, sans `width/height` (CLS).
6. **Toggle mode "Demandes / Personnes"** trompeur : les deux sections s'affichent toujours, seuls les titres changent. L'utilisateur ne comprend pas ce que fait le toggle.
7. **"Mes missions" mélangé aux pills de catégorie** : c'est un filtre d'ownership, pas une catégorie thématique. Devrait être ailleurs.
8. **Filtres non synchronisés à l'URL** : reload = perte de l'état. Aucun lien partageable.
9. **Pagination absente** : `.limit(50)` figé. Pas de "Voir plus" ni d'infinite scroll.
10. **Pas de loading skeleton** : grand espace vide pendant le chargement initial (KPIs, missions, helpers).
11. **CTA final dupliqué** : "J'ose demander" en bas alors que les 2 CTAs principaux sont déjà affichés en haut + dialog "Proposer mon aide" toujours accessible.
12. **Pas de realtime** : nouvelle mission publiée par quelqu'un = invisible jusqu'au reload.
13. **Section "Exemples"** en bas : utile pour l'éducation mais bruyante quand on cherche activement. À réserver à l'empty state global.
14. **`badge-success`** utilisé pour le badge "Gratuit pour tous les membres" — mémoire dit qu'il est réservé au pricing. À remplacer par un token neutre (ex. `bg-primary/10 text-primary`).
15. **Accessibilité** : cards mission OK (role+keydown), mais `<input type="range">` sans label visible accessible via screen reader (juste `aria-label`), à confirmer.

---

## Plan d'amélioration (ordonné par ROI)

### Lot A — Hygiène SEO + design system (rapide, fort ROI)
- Ajouter **`<meta name="robots" content="noindex, follow">`** via `PageMeta` (page connectée, contenu personnel, doublon SEO avec la page publique).
- **Supprimer le bloc Schema.org Service** (déjà sur la page publique).
- **Remplacer toutes les icônes Lucide décoratives** dans le contenu par : badges textuels pour les catégories (déjà fait sur les pills, à propager aux cards mission, pills helper, section exemples). Icônes UI fonctionnelles (`X`, `Search`, `MapPin`, `Lock`, `Check`, `ArrowRight`) **conservées** (autorisées par la mémoire).
- Remplacer le `bg-badge-success` du badge gratuit par un token primary neutre.
- Importer l'image hero via `import` Vite (asset local optimisé) avec `width/height` explicites.

### Lot B — Refacto en composants (zéro changement visuel)
Découper en :
- `src/components/missions/connected/MissionsHero.tsx`
- `src/components/missions/connected/MissionsFilterBar.tsx` (postal + rayon + recherche + pills)
- `src/components/missions/connected/MissionCard.tsx`
- `src/components/missions/connected/HelperCard.tsx`
- `src/components/missions/connected/OfferDialog.tsx` (déjà 80 lignes de Dialog dans le fichier)
- `src/components/missions/connected/ExamplesSection.tsx`
- `src/hooks/useMissionsList.ts` (regroupe les 2 useQuery + tri)
- `src/hooks/useGeocodedFilters.ts` (origin + missions/helpers coords)

Fichier `SmallMissions.tsx` cible : ~250 lignes orchestration.

### Lot C — UX & navigation
- **Synchroniser les filtres à l'URL** (`useSearchParams`) : `?cat=garden&radius=15&q=arroser&mode=offer`. Lien partageable + reload safe.
- Sortir **"Mes missions"** des pills catégories → onglet séparé en haut, à côté de "Demandes / Personnes".
- **Repenser le toggle "Demandes / Personnes"** : soit il masque vraiment l'autre section, soit on le remplace par 2 onglets stricts. Recommandation : 2 onglets stricts.
- Ajouter bouton **"Élargir le rayon"** dans les empty states quand `radiusKm > 0`.
- **Skeletons** dédiés : `MissionCardSkeleton`, `HelperCardSkeleton` pendant le premier chargement.
- Section **"Exemples"** déplacée : visible uniquement quand `missionCount === 0 && helperCount === 0` (vrai empty state global).
- Supprimer le **CTA final dupliqué** ("J'ose demander" en bas) — déjà présent en haut.

### Lot D — Performance & data
- **Préférer `m.latitude/m.longitude` (déjà en BDD) au géocodage** quand dispo. Actuellement le code le fait déjà, mais fallback vers `geocodeCity(m.city)` reste systématique pour les anciennes lignes — vérifier qu'aucune mission récente ne soit privée de coords et faire un backfill SQL si besoin.
- Ajouter **lat/lng aux profils** (`profiles.latitude/longitude`) calculés côté serveur lors de la mise à jour du code postal → supprime totalement le géocodage runtime des helpers.
- **Pagination "Voir plus"** sur les missions et helpers (50 → 20 + bouton).
- **Realtime** : abonnement Supabase Channel sur `small_missions` pour rafraîchir la liste sans reload.
- Memoizer `renderHelperCard` (actuellement créée à chaque render via IIFE).

### Lot E — Polish copy & accessibilité
- Vérifier le label du slider rayon (texte visible "Rayon" est présent — OK ; ajouter `<output>` pour le screen reader).
- Vouvoiement audit (rapide, semble déjà OK).
- Mettre la couleur du badge "Disponible pour aider" sur les cards helper en token sémantique uniforme.

---

## Détails techniques

| Lot | Risque | Effort |
|---|---|---|
| A — SEO + design tokens + icônes | Faible (visuel léger sur cards) | 30 min |
| B — Refacto composants | Faible si tests visuels | 1 h |
| C — UX (URL, onglets, skeleton, exemples conditionnels) | Moyen (changement d'IA) | 1h30 |
| D — Perf + realtime + lat/lng profiles | Moyen (migration DB) | 2 h |
| E — Polish | Faible | 20 min |

**Migration DB nécessaire (Lot D uniquement)** : ajout `profiles.latitude/longitude` + trigger de re-géocodage à la mise à jour de `postal_code`/`city` (via edge function asynchrone).

---

## Ordre d'exécution recommandé

1. **Lot A** (gain immédiat propre, pas de regression).
2. **Lot B** (refacto avant d'ajouter de la logique).
3. **Lot C** (vraie amélioration UX visible).
4. **Lot E** (polish pendant qu'on est dans le code).
5. **Lot D** (plus risqué, à faire à part).

Validez le périmètre (tous les lots, ou par exemple Lot A + B + C en première passe) et je passe à l'implémentation.
