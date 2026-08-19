---
name: breed-fiche-generation
description: Génération de fiches de race via /admin/breeds (formulaire à la demande) ; images TOUJOURS rapatriées dans property-photos/breeds/ par l'edge function, jamais de lien chaud externe
type: feature
---

Génération des fiches de race (août 2026) :

- Interface unique : /admin/breeds. Formulaire à la demande (espèce = enum pet_species complet, champ race libre) + liste de ciblage « races déclarées sans fiche » (volume animaux + annonces en ligne, saisies parasites exclues) + batch SEO historique.
- Logique pure testée : src/lib/adminBreedGeneration.ts (validation, doublon via resolveBreedFiche, filtre parasites, agrégation). Tests : src/__tests__/admin-breed-generation.test.ts.
- Détection de doublon AVANT génération via resolveBreedFiche (exact/alias/préfixe/fusion) : jamais de doublon silencieux type « gris du gabon » vs « perroquet gris du gabon ».
- RÈGLE IMAGE : toute image de fiche est téléchargée et stockée dans property-photos/breeds/{espèce}-{slug}.{ext} par l'edge function generate-breed-profile elle-même (image_credit et image_alt conservés). Jamais de hotlink Wikimedia en base. Échec de rapatriement → fiche créée SANS image (la carte de repli aquarelle prend le relais). Ne jamais réintroduire d'URL externe dans breed_profiles.image_url.
- Actions journalisées dans admin_action_logs (content_ai_generate / content_ai_regenerate).
- src/data/topBreeds.ts sert UNIQUEMENT au pré-remplissage SEO (batch), pas au rattrapage de races réelles.
