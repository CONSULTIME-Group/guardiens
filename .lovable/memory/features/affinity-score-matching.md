---
name: Affinity Score Matching
description: Score d'affinité réciproque propriétaire ↔ gardien, badge visible dans PublicProfile, SearchListingCard et SitterCard favoris
type: feature
---

## Pure function

`src/lib/affinityScore.ts` → `computeAffinityScore(owner, sitter) → AffinityResult | null`

Critères (poids 1, sauf rythme adjacent = 0.5) :
1. Animaux : intersection `pets.species` × `sitter.animal_types` (ratio)
2. Rythme de vie : exact = 1, adjacent (calme↔équilibré, équilibré↔actif) = 0.5
3. Langues : ≥1 commune
4. Intérêts : ≥2 = 1, ≥1 = 0.5
5. Présence ↔ work_during_sit (table de compatibilité)
6. Profil idéal : sitter matche un `owner.preferred_sitter_types`
7. Ambiance foyer ↔ life_pace/interests du sitter

Bonus +0.25 : sitter.special_animal_skills × pet.special_needs.

**Dégradation gracieuse** : <3 critères communs renseignés des deux côtés → `null` (badge masqué).
**Disqualification** : `sitter.sensitivities` exclut une espèce du propriétaire → `null`.

## UI

- `src/components/matching/AffinityBadge.tsx` : chip pourcentage + tooltip critères matchés.
  Tones : ≥80 success, ≥60 primary, ≥40 warning. Aucune icône Lucide ni emoji.

## Intégrations

- **PublicProfile** : calcul réciproque (owner→sitter ET sitter→owner) selon le rôle du viewer, affiché à côté des chips de rôle.
- **SearchListingCard** (tab sits) : `viewerSitterProfile` passé par `SearchSitter`, `ownerMatch` enrichi dans `fetchSits` (owner_profiles : preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected + pets.special_needs). Badge en haut à droite à côté du favori.
- **Favorites > onglet Gardiens** : `viewerOwnerContext` (owner_profile + pets agrégés des properties) calculé une fois, comparé à chaque `sitter_profile` favori. Badge à droite avant le bouton favori.

## Tests

`src/lib/__tests__/affinityScore.test.ts` : 5 cas (null si <3 critères, score haut, disqualification allergie, dégradation, rythme adjacent).
