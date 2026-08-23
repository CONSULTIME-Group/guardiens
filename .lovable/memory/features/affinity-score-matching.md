---
name: Affinity Score Matching
description: Score d'affinité réciproque propriétaire ↔ gardien. Dénominateur dynamique, poids 2/2/1/1/1/1/1, garde-fours animaux + accompagnants + critère dur, seuil 35 %. Source de vérité.
type: feature
---

## Pure function

`src/lib/affinityScore.ts` → `computeAffinityResultFull(owner, sitter) → AffinityResult | null`

7 critères, pondération différenciée :

| Critère | Poids |
|---|---|
| Animaux (intersection `pets.species` × `sitter.animal_types`) | 2 |
| Présence ↔ `work_during_sit` | 2 |
| Profil idéal (sitter matche `preferred_sitter_types`) | 1 |
| Rythme de vie (`life_pace`) | 1 |
| Langues (≥ 1 commune) | 1 |
| Intérêts (≥ 2 communs = 1, ≥ 1 = 0.5) | 1 |
| Ambiance foyer (`home_ambiance` ↔ life_pace / interests sitter) | 1 |

## Normalisation

**Dénominateur DYNAMIQUE**. Le score est normalisé sur la somme des poids des critères réellement évalués des deux côtés, pas sur un maximum fixe. Un critère absent d'un côté sort du dénominateur : il n'est ni bonus ni pénalité. Cela garantit qu'un même couple owner/gardien obtient le même score quel que soit le nombre de champs récupérés par la vue appelante (cohérence /annonces ↔ détail).

## Garde-fous (displayed:false + hiddenReason)

| `hiddenReason` | Déclencheur |
|---|---|
| `disqualified` | `sitter.sensitivities` incompatible avec une espèce de l'owner (allergies, refus d'espèce) |
| `no_animal_species_match` | Owner a des animaux ET sitter déclare une expérience, mais aucune espèce ne matche |
| `sitter_pets_not_accepted` | `sit.accepts_sitter_pets = 'no'` ET `sitter.travels_with_own_animals = true` |
| `sitter_children_not_accepted` | `sit.accepts_sitter_children = 'no'` ET `sitter.travels_with_children = true` |
| `too_few_criteria` | Moins de `minCommonCriteria` critères comparables (défaut 3) |
| `no_hard_criterion` | Aucun critère dur (Animaux ou Présence) n'a été évalué : le score ne s'affiche jamais sur des softs seuls |
| `below_threshold` | Score < `minScorePercent` (défaut 35, réglable via `feature_flags`) |

`accepts_sitter_pets = 'discuss'` avec un gardien qui voyage avec ses animaux n'impacte pas le score mais alimente `result.notes` avec une mention « à discuter ».

## Seuils (feature_flags)

- `affinity_min_common_criteria` : défaut 3
- `affinity_min_score_percent` : défaut 35

Bootstrap au démarrage via `useAffinityThresholdsBootstrap` monté dans `App.tsx`.

## Règle des deux côtés (20/08/2026)

Un critère n'est scorable que s'il existe des DEUX côtés. Ce qui n'existe que d'un côté est DESCRIPTIF : affiché comme tel, jamais présenté comme un critère de matching, et on n'ajoute pas de champ gardien pour le rendre bilatéral.

- `preferred_sitter_types` : « Sans préférence » / `no_preference` = sortie explicite du critère (dénominateur ET maxPossibleWeight). Chemins câblés : « Gardien·ne expérimenté·e » via `experience_years` ≠ « Débutant », « Débutant·e motivé·e » via `experience_years` = « Débutant » explicite, « Télétravailleur·euse » via `work_during_sit` (full/partial, repli availability_during). « Étudiant·e » / « Indépendant·e » : descriptives (`PREF_SITTER_DESCRIPTIVE`).
- `home_ambiance` : tags scorés (`HOME_AMBIANCE_SCORED_TAGS`) vs environnement descriptif (`HOME_AMBIANCE_DISPLAY_ONLY`). Alias persistés : Familial → Famille animée, Calme → Calme et posé, Cosy → Cocon casanier (`HOME_AMBIANCE_ALIASES`, dédupliqués).
- Formulaires (`OwnerStepRules`, `OnboardingAffinity`) : deux groupes séparés, « Ambiance » scorée vs « Environnement » descriptif, « Profil idéal » vs « Situation recherchée ».
- Verrou : `src/lib/__tests__/affinity-exhaustiveness.test.ts` échoue si une valeur en base n'est ni scorable ni déclarée descriptive (listes DB_* à maintenir).

## Vocabulaire centralisé

Les chaînes magiques du scoring (rythmes, présence, travail, ambiance, espèces, sensibilités, intérêts) sont centralisées dans `src/lib/affinityVocab.ts`. `src/lib/__tests__/affinityVocab.test.ts` vérifie que chaque valeur attendue par le scoring est bien présente dans les options des formulaires d'onboarding et d'édition de profil. Si un libellé de formulaire dérive, le test casse au lieu que le score se dégrade en silence.

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

## Ombrelle NAC

Un gardien déclarant « NAC » couvre les espèces owner `rodent`, `reptile`, `bird` et `nac`. Le cas « all » / « tous » reste traité comme un match universel.

## Tests

`src/lib/__tests__/affinityScore.test.ts` couvre : dénominateur dynamique, disqualification sensibilité, disqualification espèces, disqualification accompagnants, seuils, pondération critères durs > nice-to-have, règle du critère dur obligatoire, expansion NAC.

## Règles d'affichage (décision du 21/08/2026)

- **Libellés concrets** : chaque phrase nomme la donnée du couple (verrou `affinity-labels-concrete.test.ts`, valeurs sentinelles).
- **Demi-portion** : une chip positive n'apparaît que si le critère rapporte au moins la moitié de son poids ; en dessous, la phrase passe dans les freins. Distance : au-delà de 60 km TOUJOURS un frein (« À 150 km de chez vous, le trajet est long »), même au palier 0,5.
- **Une chip par critère** : ambiance, intérêts et espèces agrègent leurs tags en une seule phrase (« Campagne, calme et cocooning, comme vous »).
- **Distance, 9e critère, poids 1** : ≤ 30 km = 1 pt, ≤ 60 = 0,75, ≤ 100 = 0,5, au-delà = 0,25. `distance_km` sur `AffinityOwnerInput` (11 champs), calculée par couple, jamais stockée ; null = hors dénominateur. Câblée sur toutes les surfaces (parité verrouillée).
- **Fusion malinois** : « malinois » absorbé par « berger belge malinois » (breedFicheMerges, sitemap, redirection /races/dog-malinois).

## Exclusivité des tags d'ambiance (23/08/2026)

- `HOME_AMBIANCE_CONFLICTS` + `resolveAmbianceConflicts` dans `profileMatchingOptions.ts` : « Sportif outdoor » exclusif avec « Calme et posé » et « Cocon casanier ». Dernier choix gagne, toast explicite. Câblé dans `OwnerStepRules` et `OnboardingAffinity` (les deux groupes, scoré et descriptif).
- Le moteur (`evalAmbiance`) ne change pas : correction au formulaire, pas au calcul.
- Nettoyage base : 10 profils contradictoires, règle « dernier tag déclaré gagne », sauvegarde `_backup_home_ambiance_20260823` (10 lignes, old/new). Piège rencontré : un `array_agg` sans `FILTER (WHERE NOT is_removed)` réécrit les tags retirés ; vérifier le résultat ligne à ligne après toute migration de données.

## « Campagne » : lieu, pas tempo (décision du 23/08/2026)

evalAmbiance ne lève plus anyBad pour « Campagne » face à un gardien calme : un gardien calme n'est pas incompatible avec une maison à la campagne. Chemin positif inchangé (gardien actif ou intérêt rural = match).

Invariant verrouillé par `src/lib/__tests__/ambiance-engine-conflicts.test.ts` : l'ensemble des tags qui lèvent anyBad dans evalAmbiance (Cocon casanier, Calme et posé, Sportif outdoor) est strictement égal aux clés de HOME_AMBIANCE_CONFLICTS du formulaire. Une seule définition de ce qui se contredit, des deux côtés.

Mesure au 23/08/2026 : 46 propriétaires « Campagne + tag calme », 94 gardiens calmes sans intérêt rural, 4 324 couples récupèrent une chip d'ambiance. 0 combinaison résiduelle bloquée par « Sportif outdoor » (migration du 23/08 effective).

## Symétrie fiches publiques / moteur (23/08/2026)
La fiche publique expose TOUT ce que le moteur score, des deux côtés. Vue `public_sitter_profiles` élargie : work_during_sit, availability_during, experience_years, languages, interests, life_pace, has_license, special_animal_skills. `vehicle_type` retiré de la vue, du formulaire (StepMobility) et de la fiche : champ mort (3/1037, jamais scoré), colonne DB conservée (règle 17). `sensitivities` jamais exposé (donnée de santé, frein moteur suffit). Registres dans vocab.ts : ENGINE_NOT_PUBLIC_FIELDS, SITTER/OWNER_PUBLIC_DESCRIPTIVE_COLUMNS. Verrou build : src/lib/__tests__/public-views-affinity-symmetry.test.ts (bidirectionnel, basé sur types.ts régénéré).
