# Plan — Coups de main : photos, concept & workflow

Constat de l'audit : le module fonctionne, mais souffre de 3 problèmes majeurs.

## Problèmes identifiés

1. **Photos absentes "Près de chez vous"** : la requête `relatedMissions` dans `SmallMissionDetail.tsx` et `PublicMissionView.tsx` ne sélectionne pas `photos`. Résultat : placeholder-lettre systématique, même quand l'annonce a des photos.
2. **Concept "échange" invisible** : le champ `exchange_offer` existe en DB et est obligatoire à la création, mais rien n'explique clairement à l'utilisateur (ni côté propriétaire ni côté gardien) que **le coup de main = un échange donnant-donnant, sans argent**. Les dashboards parlent de "petites missions" ou "échanges" sans jamais définir le pacte.
3. **Workflow flou** : trois surfaces (`/petites-missions`, `/questions`, `/annonces/petites-missions`), vocabulaire mélangé (mission / échange / coup de main / besoin / offre), et aucun rappel du fonctionnement au moment de créer.

## Lot 1 — Fix photos (P0, technique)

- **`SmallMissionDetail.tsx`** (~ligne 250-300) : ajouter `photos` au `select` de la requête `relatedMissions`.
- **`PublicMissionView.tsx`** (~ligne 343) : idem.
- **Placeholder unifié** : extraire le bloc inline en un mini composant `MissionCardCover` (photo si dispo, sinon gradient par catégorie avec label "Animaux/Jardin/Maison/Savoir-faire" — pas la lettre du titre, aligné sur `SearchListingCard`).

## Lot 2 — Clarifier le concept "échange" (éditorial)

Un pacte en 1 phrase, décliné partout : **« Un coup de main = un échange. Sans argent, sans abonnement. Vous demandez, vous proposez quelque chose en retour (café, œufs, un service, une histoire). »**

- **Dashboard propriétaire** (`MissionsTabsCard.tsx`) : bandeau pédagogique 2 lignes au-dessus des onglets — pacte + CTA "Publier une demande".
- **Dashboard gardien** (`MissionsNearbySection.tsx`) : bandeau symétrique — pacte + CTA "Proposer mon aide".
- **Page dédiée** (`SmallMissions.tsx` + `SmallMissionsPublic.tsx`) : bloc "Comment ça marche" en 3 étapes visuelles fixes (1. Publier · 2. Convenir de l'échange en message · 3. Se donner un coup de main), immédiatement sous le hero.
- **Formulaire de création** (`CreateSmallMission.tsx`) : au-dessus du champ `exchange_offer`, une micro-explication + 3 exemples cliquables ("Un café et des biscuits", "Des œufs de la semaine", "Un coup de main en retour quand vous voulez") qui pré-remplissent.

## Lot 3 — Nettoyage vocabulaire (cohérence)

- Standardiser : **"coup de main"** = le module, **"demande"** / **"offre"** = les deux types, **"échange"** = ce qui se convient. Bannir "mission" et "petite mission" dans le contenu visible (URLs et code DB conservés).
- Retirer la catégorie collision `house = "Coups de main"` dans `CATEGORY_META` → renommer en `"Maison"`.
- Aligner labels catégories questions FR ↔ missions (utiliser les libellés FR partout côté UI).

## Lot 4 — Workflow allégé (UX)

- **Étape confirmation** (post-création) : afficher un écran/toast avec récap + rappel "Vous serez notifié dès qu'un membre propose un échange. À vous ensuite de valider en message."
- **Réponse (`ProposeExchangeDialog`)** : ajouter en tête du dialogue un rappel visuel de ce que le propriétaire propose en échange, pour que le répondant s'aligne.
- **`SmallMissionDetail`** : rendre le bloc `exchange_offer` beaucoup plus visible (encadré, pas noyé dans le corps).

## Hors périmètre (à valider séparément)

- Ajouter des photos aux `community_questions` (aujourd'hui zéro photo).
- Fusionner `/petites-missions` et l'onglet Besoins/Offres de `/questions` en une surface unique.
- Ajouter un champ `exchange_expected` structuré (aujourd'hui c'est du texte libre).

## Détails techniques

- Aucune migration DB nécessaire pour les Lots 1-4.
- Le placeholder cover devient un composant partagé `src/components/missions/MissionCardCover.tsx`.
- Le bandeau pédagogique devient un composant partagé `src/components/missions/ExchangePactBanner.tsx` (variantes owner/sitter/public).
- Vérifs Playwright : `/petites-missions/:id` avec photo (doit s'afficher), sans photo (fallback catégorie), dashboards (bandeau visible), création (exemples cliquables).

---

Je livre les 4 lots d'un coup, ou vous préférez que je commence par le Lot 1 (fix photos) + Lot 2 (concept) et qu'on juge avant les Lots 3-4 ?
