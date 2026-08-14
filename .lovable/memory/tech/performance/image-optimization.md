---
name: Image Optimization
description: Règles absolues de transformation d'images Storage (width+height obligatoires), plafonds d'ingestion par bucket, garde-fou Vitest
type: feature
---

# Image Optimization

## Règle absolue (passe du 14/08/2026)
Tout appel `storageImageUrl` DOIT fournir `width` ET `height`. L'endpoint conserve la hauteur d'origine quand seule la largeur est demandée : image déformée et plus lourde. Aucune exception. `storageImageSrcSet` exige un `ratio` (> 0), sinon renvoie `undefined` (échec explicite, jamais d'URL sans hauteur).

## Garde-fou
`src/__tests__/avatar-image-optimization.test.ts` (9 tests, vert, hors baseline) : scan statique .ts/.tsx (img avatar sans transformation, URL /object/public/avatars/ en dur, width sans height via comptage de parenthèses) + tests comportementaux srcset/url.

## Plafonds d'ingestion (`src/lib/compressImage.ts`)
- Avatars : `compressAvatarFile`, 1024 px (lightbox fiche publique ~1000 px), repli dégradé 512 px / q0,6 avant blocage, échec final tracé via `trackEvent("avatar_compression_failed", { ext, size_kb })`. Jamais de fichier brut stocké.
- Galeries et animaux : `compressGalleryFile`, 1600 px (lightbox ~85vh ≈ 920 px sur 1080p). Utilisé par SitterGallery, StepExperience, PetForm. Les replis silencieux sur le brut ont été supprimés (échec = toast + pas d'envoi).
- Photos propriété / messagerie : `compressImageFile(file, 5, 1200)` (uploadOwnerPhoto, OwnerGallery, InlinePhotoUpload, SitPhotoManager, OwnerStepAnimals, Messages). Messages.tsx compressait à 0 avant le 14/08/2026.

## Rendus transformés (cadres mesurés en prod)
- Fiche gardien publique : vignettes galerie + foyer 193x193 cover, lightbox 1600x1600 contain, carte recherche gardien 440x330 cover.
- Recherche annonces : carte 440x330 cover, carte mission 256x256 cover.
- Fiche annonce : hero mobile 384x240, grille principale 352x320, secondaires 176x160, lightbox 1600x1600 contain, TabLogement 224x160.
- Animaux : avatarImageUrl 20/24/42/48/56/80 selon le cadre, dialogues 448x256 cover ou 768x864 contain.
- Messagerie : vignette 480x208 contain, lightbox 768x864 contain.

## Mesures (14/08/2026)
- Fiche /gardiens/eba9e472 : 20 178 533 o → 83 949 o (240x).
- Fiche /annonces/768cd831 : 3 983 146 o → 72 351 o (55x).
- Bucket sitter-gallery avant ingestion : 458 Mo, 166 fichiers > 1 Mo. Les fichiers déjà stockés ne sont PAS retouchés (la transformation serveur suffit).

## Hors périmètre connu
ArticleEditor.tsx (admin) uploade encore brut. Images hors Storage (assets importés) non concernées.
