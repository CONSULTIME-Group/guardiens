---
name: Image Optimization
description: Règles absolues de transformation d'images Storage (width+height obligatoires), plafonds d'ingestion par bucket, replis dégradés, densité 2x pages publiques, garde-fous Vitest
type: feature
---

# Image Optimization

## Règle absolue (passe du 14/08/2026)
Tout appel `storageImageUrl` DOIT fournir `width` ET `height`. L'endpoint conserve la hauteur d'origine quand seule la largeur est demandée : image déformée et plus lourde. Aucune exception. `storageImageSrcSet` exige un `ratio` (> 0), sinon renvoie `undefined` (échec explicite, jamais d'URL sans hauteur).

## Densité (passe du 14/08/2026)
Vignettes et photos des pages publiques (fiche gardien, résultats de recherche, page annonce) servies avec facteur de densité 2 : taille demandée = 2x le cadre CSS (193 px → 386, 440x330 → 880x660, etc.). Les cadres de 20 à 24 px restent à 1x (choix assumé). Lightbox exclues du 2x (déjà largement dimensionnées). Surcoût mesuré fiche Mélanie : +166 578 o, sous le seuil des 400 ko.

## Lightbox : valeur unique par bucket
La lightbox demande exactement le plafond d'ingestion du bucket source, en contain : 1600x1600 pour sitter-gallery (PublicSitterProfile, SitterGallery), 1200x1200 pour property-photos (SitHero, MessageBubble, OwnerStepAnimals). Au-delà du plafond, l'endpoint n'a aucune donnée à servir.

## Échec d'upload : formulation unique + télémétrie
- Une seule chaîne i18n `upload.photo_failed` (5 langues), utilisée par SitterGallery, StepExperience, PetForm, Messages, MissionPhotoUpload, OwnerStepAnimals. Jamais err.message : le rejet loadImage est un ProgressEvent sans message.
- Événements (métadonnées ext + size_kb, modèle avatar_compression_failed) : sitter_gallery_upload_failed, experience_photo_upload_failed, pet_photo_upload_failed (PetForm ET OwnerStepAnimals), message_photo_upload_failed, mission_photo_upload_failed.

## Garde-fous
- `src/__tests__/avatar-image-optimization.test.ts` (9 tests) : scan statique + comportement srcset/url.
- `src/__tests__/upload-photo-feedback.test.ts` (10 tests) : formulation unique i18n, télémétrie par parcours, repli dégradé, densité 2x, plafonds lightbox.

## Plafonds d'ingestion (`src/lib/compressImage.ts`) et replis dégradés
- Avatars : `compressAvatarFile`, 1024 px, repli 512 px / q0,6, échec final tracé via `trackEvent("avatar_compression_failed")`. Jamais de brut.
- Galeries et animaux : `compressGalleryFile`, 1600 px, repli 1024 px / q0,6 (1024 reste au-dessus du cadre lightbox ~920 px à 85vh sur 1080p ; divise la mémoire canvas par ~2,4). Utilisé par SitterGallery, StepExperience, PetForm.
- Messagerie : `compressMessagePhotoFile`, 1200 px, repli 768 px / q0,6. Utilisé par Messages.
- Photos propriété : `compressImageFile(file, 5, 1200)` (uploadOwnerPhoto, OwnerGallery, InlinePhotoUpload, SitPhotoManager). MissionPhotoUpload : `compressImageFile(file, 0.3, 1200)`.
- OwnerStepAnimals conserve un compresseur canvas local historique (non refactoré vers compressGalleryFile le 14/08/2026) ; formulation et télémétrie alignées.

## Rendus transformés (cadres CSS mesurés en prod, densité 2x sur pages publiques)
- Fiche gardien publique : vignettes galerie + foyer 386x386 (cadre 193), lightbox 1600x1600 contain, animaux 96 (cadre 48), avis 64 (cadre 32), carte recherche gardien 880x660 (cadre 440x330).
- Recherche : carte annonce 880x660, carte mission 512x512, MissionCardCover/RelatedMissionCard 800x600, pins carte 60x60 (cadre 30), popup carte 560x240 (cadre 280x120), avatars résultats 96/112.
- Fiche annonce : hero mobile 768x480, grille principale 704x640, secondaires 352x320, lightbox 1200x1200 contain, TabLogement 448x320, fiche animal 896x512, avatar hôte 128/112.
- Animaux (connecté) : avatarImageUrl 20/24/42/48/56/80 selon le cadre, dialogues 1200x1200 contain.
- Messagerie : vignette 480x208 contain, lightbox 1200x1200 contain.

## Mesures (14/08/2026)
- Fiche /gardiens/eba9e472 : 20 178 533 o → 70 582 o d'images transformées (235 548 o page complète avec assets hero). Après densité 2x : 237 160 o transformées, 402 126 o page complète (+166 578 o).
- Fiche /annonces/768cd831 : 3 983 146 o → 72 351 o (55x).
- Bucket sitter-gallery avant ingestion : 458 Mo, 166 fichiers > 1 Mo. Les fichiers déjà stockés ne sont PAS retouchés (la transformation serveur suffit).

## Hors périmètre connu
ArticleEditor.tsx (admin) uploade encore brut. Images hors Storage (assets importés) non concernées.
