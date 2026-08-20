# Bucket property-photos : usages et colonnes du logement

État mesuré le 22/08/2026.

## Usages réels du bucket `property-photos` (multi-usage)

- `<uid>/owner-gallery/...` : photos du logement (338 fichiers, 49 comptes),
  référencées dans `owner_gallery` (323 lignes).
- `<uid>/pets/...` : photos d'animaux (170 fichiers, 61 comptes), référencées
  dans `pets`.
- `<uid>/<fichier>` en vrac à la racine : 81 fichiers historiques venus de
  `SitPhotoManager` (corrigé : uploads désormais rangés dans `owner-gallery/`).

Donc « bucket = logement » est faux : il sert aussi aux animaux. Ne jamais
déduire la nature d'une photo de son seul bucket.

## Colonnes `properties.photos` / `properties.cover_photo_url`

Longtemps jamais écrites (0/92 propriétés au 22/08/2026) alors que 589 photos
existaient en bucket. Seule voie d'écriture : `appendPropertyPhoto`
(`src/lib/uploadOwnerPhoto.ts`). Branchée sur : `PhotoJourneyDialog`,
`InlinePhotoUpload` (création d'annonce), `SitPhotoManager` (fiche annonce).

## Backfill proposé, en attente de validation Jérémie

Reprendre `owner_gallery` pour remplir `properties.photos` des 49 comptes
concernés. Mapping sans ambiguïté : 0 propriétaire n'a plus d'une propriété.
Aucune écriture base faite sans son accord.
