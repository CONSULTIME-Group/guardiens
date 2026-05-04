# SEQUENCE 1 — Doublons SEO par ville

Lecture seule. Aucune modification.
Sources : table `articles` (published=true) + table `seo_city_pages` (published=true).
URL articles = `/actualites/{slug}` · URL pages ville = `/house-sitting/{slug}`.

Règle de classification (colonne Notes) :
- slug contient la ville + un mot quartier (quartier, presquile, croix-rousse, chartreuse, savoie, haute-savoie, megeve, monts) → **QUARTIER, PAS DOUBLON**
- slug contient la ville + un mot animal (chat, chien, chien-anxieux, golden, malinois, border-collie, bouledogue, retriever, race) → **ANGLE SPÉCIFIQUE, PAS DOUBLON**
- slug = `/house-sitting/{ville}` (page seo_city_pages) ↔ article `house-sitting-{ville}` ou `guide-house-sitting-{ville}` ou `pet-sitting-{ville}-guide` ou `pet-sitting-{ville}-guide-complet` → **DOUBLON POTENTIEL**
- thématique transversale (vétérinaire, parcs, arrosage, jardinage, entraide, profil gardien, histoire) → **ANGLE SPÉCIFIQUE, PAS DOUBLON**

---

## LYON

| URL | Type | Slug | Title | content_length | published | noindex | Notes |
|---|---|---|---|---|---|---|---|
| /house-sitting/lyon | seo_city_page | lyon | House-sitting Lyon — Garde maison et animaux \| Guardiens | 544 | true | false | **DOUBLON POTENTIEL** (vs articles `house-sitting-lyon`, `guide-house-sitting-lyon`, `pet-sitting-lyon-guide-complet`) |
| /actualites/house-sitting-lyon | article | house-sitting-lyon | House-sitting à Lyon : un gardien de confiance chez vous | 6168 | true | false | **DOUBLON POTENTIEL** (vs /house-sitting/lyon) |
| /actualites/guide-house-sitting-lyon | article | guide-house-sitting-lyon | Guide du house-sitting à Lyon | 4109 | true | true | **DOUBLON POTENTIEL** (noindex actif — neutralisé) |
| /actualites/pet-sitting-lyon-guide-complet | article | pet-sitting-lyon-guide-complet | Pet sitting à Lyon : trouvez la perle rare… | 6056 | true | true | **DOUBLON POTENTIEL** (noindex actif — neutralisé) |
| /actualites/garde-chien-lyon-solutions | article | garde-chien-lyon-solutions | Garde de chien à Lyon : quelle est la meilleure solution… | 2636 | true | true | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/garde-chat-domicile-lyon | article | garde-chat-domicile-lyon | Garde de chat à Lyon : faire garder son chat à domicile sans stress | 15519 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/garde-chat-presquile-lyon | article | garde-chat-presquile-lyon | Garde de chat à la Presqu'île de Lyon | 13855 | true | false | QUARTIER, PAS DOUBLON |
| /actualites/garde-animaux-croix-rousse-lyon | article | garde-animaux-croix-rousse-lyon | Garde de chien et de chat à la Croix-Rousse | 19149 | true | false | QUARTIER, PAS DOUBLON |
| /actualites/golden-retriever-lyon-guide-race | article | golden-retriever-lyon-guide-race | Le Golden Retriever : tout savoir sur le compagnon idéal des familles | 6377 | true | true | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/malinois-lyon-guide-race | article | malinois-lyon-guide-race | Le Malinois : guide complet pour le garder en milieu urbain | 7702 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/bouledogue-francais-lyon-guide-race | article | bouledogue-francais-lyon-guide-race | Le Bouledogue Français : le roi des appartements | 5685 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/border-collie-lyon-guide-race | article | border-collie-lyon-guide-race | Le Border Collie : comment gérer une pile électrique en ville | 5883 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/parcs-chiens-lyon-guide-complet | article | parcs-chiens-lyon-guide-complet | Parcs et balades avec son chien à Lyon : le guide complet | 5278 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/guide-lieu-meilleurs-parcs-chiens-lyon | article | guide-lieu-meilleurs-parcs-chiens-lyon | Où promener son chien à Lyon ? Le guide ultime des parcs | 3784 | true | true | ANGLE SPÉCIFIQUE, PAS DOUBLON (mais doublon interne avec `parcs-chiens-lyon-guide-complet` — noindex actif) |
| /actualites/veterinaire-urgence-lyon-guide | article | veterinaire-urgence-lyon-guide | Vétérinaire urgence Lyon : tous les numéros et cliniques | 3631 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/conseil-gardien-creer-profil-attractif-lyon | article | conseil-gardien-creer-profil-attractif-lyon | Comment rédiger un profil de gardien qui inspire confiance à Lyon | 3887 | true | true | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/notre-histoire-pet-sitting-argentine-lyon | article | notre-histoire-pet-sitting-argentine-lyon | Notre histoire : du pet sitting en Argentine à la création de Guardiens à Lyon | 5310 | true | true | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/arroser-plantes-vacances-lyon | article | arroser-plantes-vacances-lyon | Qui peut arroser mes plantes pendant les vacances à Lyon ? | 2536 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/jardinage-entraide-quartier-lyon | article | jardinage-entraide-quartier-lyon | Jardinage de quartier à Lyon | 2440 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/courses-aide-domicile-entraide-senior-lyon | article | courses-aide-domicile-entraide-senior-lyon | Aide aux courses et services du quotidien entre particuliers | 2332 | true | true | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/reseau-entraide-quartier-lyon-aura | article | reseau-entraide-quartier-lyon-aura | Recréer un réseau d'entraide en AURA | 2476 | true | true | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/garde-ferme-animaux-monts-du-lyonnais | article | garde-ferme-animaux-monts-du-lyonnais | Garde de ferme et d'animaux dans les Monts du Lyonnais | 3401 | true | true | QUARTIER, PAS DOUBLON |
| /actualites/bricolage-montage-meubles-entraide-grenoble-lyon | article | bricolage-montage-meubles-entraide-grenoble-lyon | Bricolage et montage meubles entre particuliers en AURA | 2120 | true | true | ANGLE SPÉCIFIQUE, PAS DOUBLON |

---

## ANNECY

| URL | Type | Slug | Title | content_length | published | noindex | Notes |
|---|---|---|---|---|---|---|---|
| /house-sitting/annecy | seo_city_page | annecy | House-sitting Annecy — Garde maison et animaux \| Guardiens | 558 | true | false | **DOUBLON POTENTIEL** (vs articles `house-sitting-annecy`, `pet-sitting-annecy-guide`) |
| /actualites/house-sitting-annecy | article | house-sitting-annecy | House-sitting à Annecy : gardiens vérifiés, locaux, disponibles | 7671 | true | false | **DOUBLON POTENTIEL** (vs /house-sitting/annecy) |
| /actualites/pet-sitting-annecy-guide | article | pet-sitting-annecy-guide | Pet sitting à Annecy : gardez des animaux au bord du lac | 2307 | true | true | **DOUBLON POTENTIEL** (noindex actif — neutralisé) |
| /actualites/house-sitting-haute-savoie-annecy-megeve | article | house-sitting-haute-savoie-annecy-megeve | House-sitting en Haute-Savoie : Annecy, Megève et les sommets | 3713 | true | true | QUARTIER, PAS DOUBLON (couvre département) |
| /actualites/parcs-balades-chiens-annecy-guide | article | parcs-balades-chiens-annecy-guide | Balades et parcs avec son chien à Annecy | 4296 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/veterinaire-urgence-annecy-haute-savoie | article | veterinaire-urgence-annecy-haute-savoie | Vétérinaire urgence Annecy : les numéros vérifiés | 3370 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/arroser-plantes-vacances-annecy | article | arroser-plantes-vacances-annecy | Qui peut arroser mes plantes pendant les vacances à Annecy ? | 2218 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/jardinage-entraide-quartier-annecy | article | jardinage-entraide-quartier-annecy | Jardinage de quartier à Annecy | 2599 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |

---

## GRENOBLE

| URL | Type | Slug | Title | content_length | published | noindex | Notes |
|---|---|---|---|---|---|---|---|
| /house-sitting/grenoble | seo_city_page | grenoble | House-sitting Grenoble — Garde maison et animaux \| Guardiens | 569 | true | false | **DOUBLON POTENTIEL** (vs articles `house-sitting-grenoble`, `pet-sitting-grenoble-guide`, `pet-sitting-grenoble-chartreuse`) |
| /actualites/house-sitting-grenoble | article | house-sitting-grenoble | House-sitting à Grenoble : des gardiens dans votre quartier | 5578 | true | false | **DOUBLON POTENTIEL** (vs /house-sitting/grenoble) |
| /actualites/pet-sitting-grenoble-guide | article | pet-sitting-grenoble-guide | Pet sitting à Grenoble : garde d'animaux au pied des Alpes | 2040 | true | true | **DOUBLON POTENTIEL** (noindex actif — neutralisé) |
| /actualites/pet-sitting-grenoble-chartreuse | article | pet-sitting-grenoble-chartreuse | Pet-sitting à Grenoble et Chartreuse | 3071 | true | true | QUARTIER, PAS DOUBLON |
| /actualites/parcs-balades-chiens-grenoble-guide | article | parcs-balades-chiens-grenoble-guide | Balades et parcs avec son chien à Grenoble : le guide 2026 | 4591 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/veterinaire-urgence-grenoble-isere | article | veterinaire-urgence-grenoble-isere | Vétérinaire urgence Grenoble : les numéros vérifiés | 3569 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/arroser-plantes-vacances-grenoble | article | arroser-plantes-vacances-grenoble | Qui peut arroser mes plantes pendant les vacances à Grenoble ? | 2015 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/jardinage-entraide-locale-grenoble | article | jardinage-entraide-locale-grenoble | Jardinage et entraide locale à Grenoble | 2179 | true | false | ANGLE SPÉCIFIQUE, PAS DOUBLON |
| /actualites/bricolage-montage-meubles-entraide-grenoble-lyon | article | bricolage-montage-meubles-entraide-grenoble-lyon | Bricolage et montage meubles entre particuliers en AURA | 2120 | true | true | ANGLE SPÉCIFIQUE, PAS DOUBLON |

---

## CHAMBÉRY

| URL | Type | Slug | Title | content_length | published | noindex | Notes |
|---|---|---|---|---|---|---|---|
| /house-sitting/chambery | seo_city_page | chambery | House-sitting Chambéry — Garde maison et animaux \| Guardiens | 494 | true | false | **DOUBLON POTENTIEL** (vs articles `house-sitting-chambery`, `pet-sitting-chambery-savoie`) |
| /actualites/house-sitting-chambery | article | house-sitting-chambery | House-sitting à Chambéry : partez sans inquiétude | 4713 | true | false | **DOUBLON POTENTIEL** (vs /house-sitting/chambery) |
| /actualites/pet-sitting-chambery-savoie | article | pet-sitting-chambery-savoie | Pet-sitting à Chambéry : La garde de confiance au pied des Alpes | 4053 | true | true | **DOUBLON POTENTIEL** (noindex actif — neutralisé) |

---

## TOTAL DOUBLONS

Comptage des **paires** où au moins 2 URL indexables ciblent la même intention « house-sitting / pet-sitting {ville} » sans angle quartier ni angle animal.

- **Lyon** : 3 paires actives en doublon potentiel
  - /house-sitting/lyon ↔ /actualites/house-sitting-lyon (les 2 indexables)
  - /house-sitting/lyon ↔ /actualites/guide-house-sitting-lyon (article noindex → neutralisé)
  - /house-sitting/lyon ↔ /actualites/pet-sitting-lyon-guide-complet (article noindex → neutralisé)
  - **Doublons réellement indexables : 1 paire** (`/house-sitting/lyon` ↔ `/actualites/house-sitting-lyon`)

- **Annecy** : 2 paires
  - /house-sitting/annecy ↔ /actualites/house-sitting-annecy (les 2 indexables)
  - /house-sitting/annecy ↔ /actualites/pet-sitting-annecy-guide (article noindex → neutralisé)
  - **Doublons réellement indexables : 1 paire**

- **Grenoble** : 2 paires
  - /house-sitting/grenoble ↔ /actualites/house-sitting-grenoble (les 2 indexables)
  - /house-sitting/grenoble ↔ /actualites/pet-sitting-grenoble-guide (article noindex → neutralisé)
  - **Doublons réellement indexables : 1 paire**

- **Chambéry** : 2 paires
  - /house-sitting/chambery ↔ /actualites/house-sitting-chambery (les 2 indexables)
  - /house-sitting/chambery ↔ /actualites/pet-sitting-chambery-savoie (article noindex → neutralisé)
  - **Doublons réellement indexables : 1 paire**

**TOTAL réellement indexables : 4 paires de doublons** (1 par ville), toutes du même pattern : `seo_city_pages.{ville}` vs `articles.house-sitting-{ville}`.
