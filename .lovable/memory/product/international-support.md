---
name: International Support
description: Règle non négociable du 16/08/2026, un inscrit hors France peut publier une annonce. Pays ISO alpha-2, défaut FR, géocodage toujours conditionné au pays.
type: feature
---
# International Support

## Règle non négociable (posée par le propriétaire de la plateforme le 16/08/2026)
Un inscrit hors France peut publier une annonce. Guardiens compte des membres dans 18 pays. Toute évolution qui réintroduit une hypothèse « France uniquement » dans le parcours de création est une régression.

## Application
- `isPostalCodeValidForCountry` / `isIdentityComplete` (src/lib/setupState.ts) : format strict 5 chiffres pour la France ou un pays non renseigné, format permissif de 2 à 12 caractères (chiffres, lettres, espaces, tirets, casse indifférente) pour tout autre pays. Ne jamais coder les formats postaux pays par pays.
- Le bloc identité du tunnel de création (InlineIdentityBlock) collecte prénom, pays (Select depuis COUNTRIES, défaut FR) et code postal, et écrit les trois sur profiles.
- Le pays du profil amorce le pays de l'annonce (sitCountry) tant que celui-ci est resté au défaut, sinon l'annonce serait géocodée comme française et invisible dans la recherche.
- Géocodage : toujours passer le pays à geocodeCity quand il est connu. Les edges geocode et geocode-profile sont internationalisées (alias ISO, Nominatim countrycodes, BAN réservé à la France).
- Trigger trg_geocode_profile : écoute city, postal_code, country, et sa condition de court-circuit inclut country (migration du 16/08/2026).
- Tunnel post-inscription (/sits/create?source=signup) : vaut pour owner ET both, un polyvalent est aussi propriétaire (93 comptes en base au 16/08/2026).

## Pourquoi
Les formats postaux nationaux sont incompatibles avec une validation française stricte (4 chiffres en Belgique ou en Suisse, alphanumérique au Canada ou au Royaume-Uni). La promesse de proximité est mondiale, pas régionale (cf. contrainte No AURA).
