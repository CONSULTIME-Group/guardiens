
# Audit /petites-missions — État & plan

## Constat (ce qui va, ce qui coince)

**Forces**
- H1 unique, hiérarchie de titres saine, FAQ + Service en JSON-LD, breadcrumb OK.
- Hero clair, double CTA "Je propose / J'ai besoin", sticky CTA mobile, levée des freins bien rédigée, illustrations gouache cohérentes.
- KPIs dynamiques (missions réalisées, membres actifs) via `get_public_stats`.

**Faiblesses principales**
1. **Maillage interne = 0 lien éditorial sortant** (vers `/tarifs`, `/faq`, `/actualites`, hubs villes). Plus gros levier SEO sous-exploité.
2. **Volume éditorial ~575 mots** — trop court pour un mot-clé concurrentiel "entraide locale / coup de main entre voisins".
3. **Pas de preuve sociale concrète** : aucun témoignage, aucun extrait de mission réelle, aucune mission ouverte affichée (alors que `MissionsCityPage` le fait déjà pour Lyon).
4. **Pas de Schema HowTo** alors que les blocs "01/02/03" sont taillés pour ça.
5. **Pas de section "France entière + près de chez vous"** rassurante (rappel mémoire : promesse mondiale, pas régionale).
6. **Cache-buster `?v=gouache-v2-...`** sur les 6 illustrations → casse le cache long, à retirer.
7. **Fichier monolithique 736 lignes** — sections extractibles en composants (`HeroMissions`, `ObjectionsList`, `ExamplesGrid`, `RulesBlock`, `MissionsFaq`).
8. **Mention "voisins" résiduelle à vérifier** (mémoire : mot proscrit) — audit grep nécessaire.
9. **Aucune image hero / LCP candidate faible** — texte pur au-dessus de la ligne de flottaison, OK perf mais peu mémorable.
10. **Pas de bandeau `ReachReassuranceBanner`** (composant existant) pour ancrer la couverture France entière.

---

## Plan d'amélioration (ordonné par ROI)

### Lot 1 — SEO structurel (impact fort, effort faible)
- Ajouter un bloc **"Pour aller plus loin"** en bas de page : 6 liens internes contextuels (`/house-sitting/lyon|annecy|grenoble`, `/tarifs`, `/faq`, 2 articles `/actualites/*` connexes).
- Injecter **2 blocs `HowTo` JSON-LD** dérivés des cards "Besoin" et "Offre".
- Ajouter le **`ReachReassuranceBanner`** sous le hero (couverture France entière).
- Audit grep "voisin/voisinage/AURA" sur le fichier + corrections si présent.
- Retirer le cache-buster `ILLU_VERSION` (les imports Vite gèrent déjà le hash).

### Lot 2 — Densification éditoriale (+700 mots)
- Section **"Pourquoi l'entraide locale fonctionne"** (cadre social, ancrage local, vouvoiement, ~350 mots).
- Section **"Échange sans argent : ce que dit la loi"** (rassurance YMYL, ~350 mots).
- Enrichir 2-3 réponses FAQ courtes existantes (passer de 1 à 3-4 phrases).

### Lot 3 — Preuve sociale & conversion
- Bloc **"Missions ouvertes près de chez vous"** : reproduire la logique de `MissionsCityPage` (12 missions max via `small_missions` + `haversineDistance` si géoloc, sinon les 12 plus récentes).
- Bloc **3 témoignages** (citation + prénom + ville) — hardcodés au début, alimentés par BDD plus tard.

### Lot 4 — Refacto & maintenabilité (zéro impact visuel)
- Extraire le fichier 736 lignes en composants dans `src/components/missions/public/` :
  `HeroMissions`, `ConvictionBlock`, `ObjectionsList`, `TwoModesCards`, `ExamplesGrid`, `RulesBlock`, `FinalCta`, `MissionsFaq`, `MoreLinksFooter`.
- Centraliser `FAQ_ITEMS` et `examples` dans `src/data/missionsPublicContent.ts`.

### Lot 5 — Polish UX
- Ajouter un **lien retour discret** sous le breadcrumb (déjà dans Header, à confirmer).
- Vérifier la couleur des CTA secondaires sur mobile (contraste `border-2 border-primary text-primary`).
- Pré-charger la 1ère illustration de la mosaïque hero (`fetchpriority="high"`).

---

## Détails techniques

| Lot | Fichiers touchés | Risque |
|---|---|---|
| 1 | `SmallMissionsPublic.tsx` (ajout bloc + JSON-LD), `data/missionsPublicContent.ts` (nouveau) | Faible |
| 2 | `SmallMissionsPublic.tsx` (2 sections JSX), `FAQ_ITEMS` étendu | Faible |
| 3 | Nouveau hook `useNearbyOpenMissions` (réutilise pattern `MissionsCityPage`) | Moyen (perf si non-géolocalisé → fallback "12 plus récentes") |
| 4 | Splits purs, aucun changement de rendu | Faible si tests visuels |
| 5 | CSS / `<link rel="preload">` dans `<Helmet>` | Faible |

**Pas de migration DB requise.** Tout reste en frontend + JSON-LD.

---

## Ordre d'exécution recommandé

1. Lot 1 (1 PR) — gain SEO immédiat, ~30 min de travail.
2. Lot 4 (1 PR) — refacto avant d'ajouter du contenu.
3. Lot 2 + Lot 3 (1 PR) — densification + preuve sociale.
4. Lot 5 (1 PR finale) — polish.

Validez-moi le périmètre (tous les lots, ou priorité Lot 1 + Lot 3 par exemple) et je passe à l'implémentation.
