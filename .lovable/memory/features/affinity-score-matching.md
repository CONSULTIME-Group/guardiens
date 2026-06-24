---
name: Affinity Score Matching
description: Score d'affinité réciproque propriétaire ↔ gardien, dénominateur fixe sur 9 (X/7 critères), badge dans PublicProfile, SearchListingCard, Favorites
type: feature
---

## Pure function

`src/lib/affinityScore.ts` → `computeAffinityScore(owner, sitter) → AffinityResult | null`

7 critères, pondérés :
1. Animaux (poids 2) : intersection `pets.species` × `sitter.animal_types`
2. Présence ↔ work_during_sit (poids 2)
3. Rythme de vie (poids 1) : exact = 1, adjacent = 0.5
4. Langues (poids 1) : ≥1 commune
5. Intérêts (poids 1) : ≥2 = 1, ≥1 = 0.5
6. Profil idéal (poids 1) : sitter matche `owner.preferred_sitter_types`
7. Ambiance foyer (poids 1) : ↔ life_pace / interests sitter

## Normalisation (depuis juin 2026)

**Dénominateur FIXE = MAX_WEIGHT = 9** (poids cumulé des 7 critères).
Les critères non comparables (info manquante d'un côté) valent 0 point et tirent le score vers le bas. Fini les "80% partout" mécaniques liés à un dénominateur dynamique sur 3-4 critères.

Conséquence : un profil incomplet affiche un score modeste, ce qui incite à compléter. Un score élevé devient un vrai signal.

**Seuils d'affichage** :
- < 3 critères comparables → `null` (badge masqué, `hiddenReason: "too_few_criteria"`)
- score < 40 % → `null` (`hiddenReason: "below_threshold"`)
- `sitter.sensitivities` incompatible avec une espèce de l'owner → `null` (`disqualified`)

## UI

- `src/components/matching/AffinityBadge.tsx` : chip `XX% · N/7` + popover.
  Tones : ≥80 success, ≥60 primary, ≥40 warning.
  Popover affiche les critères matchés + ligne explicative quand `total < 7` ("Le score augmente quand les profils se complètent").
  Aucune icône Lucide ni emoji.

## Intégrations

- **PublicProfile** : calcul réciproque selon le rôle du viewer.
- **SearchListingCard** (tab sits) : `viewerSitterProfile` + `ownerMatch` enrichi dans `fetchSits`.
- **Favorites > Gardiens** : `viewerOwnerContext` comparé à chaque sitter favori.

## Tests

`src/lib/__tests__/affinityScore.test.ts` : 12 cas (null si <3 critères, score complet 100%, disqualification allergie, dénominateur fixe pénalise les profils incomplets, rythme adjacent sous seuil, pondération animaux>nice-to-have…).
