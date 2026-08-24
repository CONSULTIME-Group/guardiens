# Variables dynamiques du contenu éditorial

Les articles, les pages villes et les pages départements acceptent des
placeholders de la forme `{{cle}}` ou `{{ cle }}`. Ils sont remplacés au
rendu par les chiffres réels de la plateforme, issus de la fonction SQL
`get_content_stats`. Un chiffre écrit via un placeholder ne périme jamais.

## Règle éditoriale à retenir

**Écrire le mécanisme, jamais l'état.** On rédige « {{ville_gardiens}}
gardiens habitent Toulouse », jamais « 14 gardiens habitent Toulouse ».
Le chiffre affiché provient de la même source que le compteur de la page,
il ne peut donc jamais le contredire.

Les chiffres ville et département sont lus dans les colonnes existantes de
`seo_city_pages` et `seo_department_pages` (`sitter_count`,
`nearby_sitter_count`, `active_sits_count`), exactement celles qui
alimentent les compteurs visibles sur ces pages. Ils ne sont jamais
recalculés par une requête parallèle.

## Écritures acceptées

Chaque clé accepte trois formes équivalentes :

- `{{ville_gardiens}}` (forme canonique)
- `{{ville.gardiens}}` (forme préfixée par la portée)
- `{{stats.profils_gardien}}` pour les clés globales

Les espaces sont tolérés : `{{ profils_gardien }}` fonctionne.

Les nombres sont affichés au format français avec séparateur de milliers
(exemple : 1 240).

## Clés globales (disponibles partout)

| Clé | Signification |
|---|---|
| `total_inscrits` | Nombre total d'inscrits |
| `profils_gardien` | Profils avec un espace gardien |
| `profils_proprio` | Profils avec un espace propriétaire |
| `inscrits_30j` | Inscriptions des 30 derniers jours |
| `city_guides` | Guides de ville publiés |
| `city_guide_places` | Lieux référencés dans les guides publiés |
| `breed_profiles` | Fiches races |
| `villes_couvertes` | Pages villes publiées et indexables |
| `departements_couverts` | Pages départements publiées et indexables |

## Clés ville (pages villes, ou article rattaché à une ville couverte)

| Clé | Signification |
|---|---|
| `ville_nom` | Nom de la ville |
| `ville_departement` | Département de la ville |
| `ville_gardiens` | Gardiens habitant la ville |
| `ville_gardiens_proximite` | Gardiens qui interviennent dans le secteur sans y habiter |
| `ville_gardiens_total` | Somme des deux |
| `ville_annonces_actives` | Annonces de garde actives dans la ville |

## Clés département (pages départements)

| Clé | Signification |
|---|---|
| `departement_nom` | Nom du département |
| `departement_gardiens` | Gardiens du département |
| `departement_annonces_actives` | Annonces de garde actives du département |

## Exemple rédactionnel

```markdown
## Une communauté qui grandit

{{profils_gardien}} gardiens sont inscrits sur Guardiens, dont
{{ville_gardiens}} qui habitent {{ville_nom}} même. {{inscrits_30j}}
personnes nous ont rejoints ces trente derniers jours.
```

## Comportement en cas de problème

Aucun placeholder ne reste jamais visible dans la page. Si une clé est
inconnue ou si sa valeur est indisponible, le placeholder est retiré du
texte et un avertissement est émis en console. L'éditeur d'article affiche
la liste des clés inconnues avant publication : la corriger avant de
publier, un texte amputé d'un chiffre peut devenir incorrect.

## Prerender

Sur les pages concernées, `window.prerenderReady` n'est déclenché qu'une
fois les valeurs chargées, pour que les robots d'indexation figent une
version où les chiffres sont présents.
