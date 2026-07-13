---
name: Affinity Score Matching
description: Score d'affinité réciproque propriétaire ↔ gardien. Barème MAX=9, poids uniformes, garde-fous animaux + accompagnants, seuil 35 %. Source de vérité.
type: feature
---

## Pure function

`src/lib/affinityScore.ts` → `computeAffinityResultFull(owner, sitter) → AffinityResult | null`

7 critères, pondération unifiée :

| Critère | Poids |
|---|---|
| Animaux (intersection `pets.species` × `sitter.animal_types`) | 2 |
| Présence ↔ `work_during_sit` | 2 |
| Rythme de vie (`life_pace`) | 1 |
| Langues (≥ 1 commune) | 1 |
| Intérêts (≥ 2 = 1, ≥ 1 = 0.5) | 1 |
| Profil idéal (sitter matche `preferred_sitter_types`) | 1 |
| Ambiance foyer (`home_ambiance` ↔ life_pace / interests sitter) | 1 |

## Normalisation

**Dénominateur FIXE = MAX_WEIGHT = 9**. Les critères non renseignés valent 0 point et tirent le score vers le bas. Un profil complet peut atteindre 100 %, un profil creux plafonne mécaniquement.

## Garde-fous (score = null, badge masqué)

| `hiddenReason` | Déclencheur |
|---|---|
| `disqualified` | `sitter.sensitivities` incompatible avec une espèce de l'owner (allergies, refus d'espèce) |
| `no_animal_species_match` | Owner a des animaux ET sitter déclare une expérience, mais aucune espèce ne matche |
| `sitter_pets_not_accepted` | `sit.accepts_sitter_pets = 'no'` ET `sitter.travels_with_own_animals = true` |
| `sitter_children_not_accepted` | `sit.accepts_sitter_children = 'no'` ET `sitter.travels_with_children = true` |
| `too_few_criteria` | Moins de `minCommonCriteria` critères comparables (défaut 2) |
| `below_threshold` | Score < `minScorePercent` (défaut 35, réglable via `feature_flags`) |

`accepts_sitter_pets = 'discuss'` avec un gardien qui voyage avec ses animaux n'impacte pas le score mais alimente `result.notes` avec une mention « à discuter ».

## Seuils (feature_flags)

- `affinity_min_common_criteria` : défaut 2
- `affinity_min_score_percent` : défaut 35 (juillet 2026, abaissé depuis 40)

Bootstrap au démarrage via `useAffinityThresholdsBootstrap` monté dans `App.tsx`.

## UI

- `src/components/matching/AffinityBadge.tsx` : chip `XX% · N/7` + popover.
  Tones : ≥ 80 success, ≥ 60 primary, ≥ 40 warning.
  Aucune icône Lucide ni emoji.

## Intégrations

- **PublicProfile** : calcul réciproque selon le rôle du viewer.
- **SearchListingCard** (onglet sits) : `viewerSitterProfile` + `ownerMatch` enrichi.
- **Favorites > Gardiens** : `viewerOwnerContext` vs sitter favori.
- **ApplicationsList** (owner) : score sur chaque candidature.
- **Sits list, ApplicationModal, Favorites > Sits** : chip d'affinité (Chantier UI juillet 2026).

## Onboarding (OnboardingAffinity)

Capture désormais les 12 champs de la formule :

- Sitter : `animal_types`, `work_during_sit`, `sitter_type`
- Owner : `presence_expected`, `preferred_sitter_types`, `home_ambiance`
- Partagés : `life_pace`, `interests`, `languages` (persistés sur `sitter_profiles` et/ou `owner_profiles` selon les rôles actifs)

Objectif : après complétion, tous les critères de la formule ont une valeur non nulle, un profil complet peut atteindre 100 %.

## Tests

`src/lib/__tests__/affinityScore.test.ts` couvre : dénominateur fixe = 9, disqualification sensibilité, disqualification espèces, disqualification accompagnants, seuils, pondération critères durs > nice-to-have.
