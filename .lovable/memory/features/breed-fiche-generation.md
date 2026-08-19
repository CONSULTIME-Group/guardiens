---
name: breed-fiche-generation
description: Génération de fiches de race via /admin/breeds (formulaire à la demande) ; images TOUJOURS rapatriées dans property-photos/breeds/ par l'edge function ; mode image_only pour le rapatriement seul ; garde withTimeout sur les appels longs
type: feature
---

Génération des fiches de race (août 2026) :

- Interface unique : /admin/breeds. Formulaire à la demande (espèce = enum pet_species complet, champ race libre) + liste de ciblage « races déclarées sans fiche » (volume animaux + annonces en ligne, saisies parasites exclues) + batch SEO historique.
- Logique pure testée : src/lib/adminBreedGeneration.ts (validation, doublon via resolveBreedFiche, filtre parasites, agrégation). Tests : src/__tests__/admin-breed-generation.test.ts.
- Détection de doublon AVANT génération via resolveBreedFiche (exact/alias/préfixe/fusion) : jamais de doublon silencieux type « gris du gabon » vs « perroquet gris du gabon ».
- RÈGLE IMAGE : toute image de fiche est téléchargée et stockée dans property-photos/breeds/{espèce}-{slug}.{ext} par l'edge function generate-breed-profile elle-même (image_credit et image_alt conservés). Jamais de hotlink Wikimedia en base. Échec de rapatriement → fiche créée SANS image (la carte de repli aquarelle prend le relais). Ne jamais réintroduire d'URL externe dans breed_profiles.image_url.
- Mode `image_only: true` (body) : rapatrie l'image d'une fiche EXISTANTE sans toucher au texte. Exposé dans /admin/breeds par un bouton sur chaque fiche sans image (trace `phase: "image_only"` dans les logs de la fonction).
- La fonction répond avec image_status (stored/none) + image_detail ; l'admin affiche ce bilan à l'écran. Wikimedia 429 fréquents depuis les IP partagées : User-Agent explicite côté fonction, relance via le bouton image_only.
- ANTI-BLOCAGE UI : tout appel long à la fonction est enveloppé dans withTimeout (src/lib/withTimeout.ts, 150 s génération, 60 s rapatriement). Sans ça, une promesse gelée laissait l'état « en cours » allumé et bloquait la page (19/08/2026). Timeout ≠ échec : la génération continue côté serveur. prefillForm ne touche jamais l'état « en cours ».
- CONTRAT difficulty_level : « Niveau. explication » (premier mot Facile/Modéré/Exigeant, suivi d'un point). La fonction injecte cet impératif dans le prompt. extractDifficultyLevel tolère point, virgule, deux-points et espace (testé sur les chaînes réelles).
- Actions journalisées dans admin_action_logs (content_ai_generate / content_ai_regenerate / content_ai_image_repatriate).
- src/data/topBreeds.ts sert UNIQUEMENT au pré-remplissage SEO (batch), pas au rattrapage de races réelles.
