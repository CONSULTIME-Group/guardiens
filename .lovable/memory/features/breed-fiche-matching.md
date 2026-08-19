---
name: breed-fiche-matching
description: Rapprochement race déclarée → fiche (trim, minuscules, sans accents, alias, préfixes « Croisé », fiches fusionnées). Source unique src/lib/breedFicheMatch.ts + breedFicheMerges.js (fusion doublons). 89/124 animaux couverts (72 %), 15 fiches.
type: feature
---

Rapprochement race → fiche (août 2026), couverture passée de 38/124 (31 %) à 89/124 (72 %) animaux, 4/15 → 15/15 fiches utiles :

- Source unique : src/lib/breedFicheMatch.ts (resolveBreedFiche). Utilisée par BreedProfileCard (carte animal), computeBreedUsage (/races) et la détection de doublon admin (adminBreedGeneration). Jamais de seconde logique de normalisation.
- Normalisation partagée : trim, minuscules, suppression des accents. breedFicheKey neutralise en plus féminin (« européenne » → « européen ») et pluriel (« poils longs » → « poil long ») pour le rapprochement exact.
- Alias curés (saisies réelles du vivier) : gouttière → européen ; staf → staffordshire bull terrier ; staff/amstaff → american staffordshire terrier (amstaff ≠ staf : pas la même race) ; charteux → chartreux ; yorshire → yorkshire terrier ; rotweiler → rottweiler ; border → border collie ; golden → golden retriever ; roumain → berger roumain.
- Règle du croisement : « croisé X » / « x … » → fiche de la race citée, si et seulement si elle est unique (ex. « croisé labrador » → labrador retriever). Une fiche exacte « croisé bichon » prime.
- Ordre de résolution : alias → exact (clé tolérante) → croisement → préfixe unique (« labrador » → « labrador retriever »). Jamais de croisement d'espèces. Ambiguïté → null, pas de faux lien.
- Fiches fusionnées (doublons éditoriaux) : src/lib/breedFicheMerges.js (.js partagé Deno/Node/.mjs) + breedFicheMerges.d.ts. « gris du gabon » → « perroquet gris du gabon », « jack russel » → « jack russell » (URL historique redirigée dans BreedPage, retirée de /races et des deux sitemaps). Toute nouvelle fusion DOIT être ajoutée aux 4 endroits : breedFicheMerges.js, scripts/generate-sitemap.mjs, supabase/functions/sitemap/index.ts, resolveBreedFiche (via import).
- Garde-fou : jamais de match sur saisie parasite (« 16 kgs », « Le plus beau! », énumérations) ; clés trop courtes refusées en préfixe ; préférer l'exact au préfixe (« malinois » → fiche « malinois », pas « berger belge malinois »).
- Tests : src/__tests__/breed-fiche-match.test.ts (52 tests, alias réels inclus).
