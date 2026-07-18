## Objectif
Introduire, sur `SitterDashboard` uniquement pour les breakpoints `lg` et plus, une grille 2 colonnes : flux principal à gauche, rail collant à droite. En dessous de `lg`, l'ordre et le rendu actuels sont conservés à l'identique.

## 1. Cartographie des sections actuellement rendues

Deux branches distinctes dans `src/components/dashboard/SitterDashboard.tsx` :

### Branche A, `isNewSitter` (lignes 471-526)
Ordre actuel :
1. NBA affinité (`SitterFirstNBA` / `NoNearbySitsEmptyState` / skeleton)
2. `CommunityPulseBanner`
3. `AccessGateBanner` ou `FreePeriodBanner`
4. `ChecklistBlock` (activation profil)
5. `NearbyHelpersCarousel`
6. `ConseilsDiscoveryCard`
7. `EmailDigestCard`
8. `buildSecondaryAccordion()` (réputation / badges / urgence)

### Branche B, gardien confirmé (lignes 528-608)
Ordre actuel :
1. `SitterCockpit` (header + action prioritaire)
2. Erreurs `DashboardSectionState` éventuelles
3. `SitterActivityPanel` (KPI)
4. `CommunityPulseBanner`
5. `AccessGateBanner` / `FreePeriodBanner` (si pas de `nextGuard`)
6. `ChecklistBlock`
7. `DiscoverySections` (Annonces + Entraide + `NearbyHelpersCarousel` + `SitterMissionsSection` + `CommunityQuestionsSection`)
8. `ConseilsDiscoveryCard`
9. `EmailDigestCard`
10. `buildSecondaryAccordion()`

### Répartition proposée en desktop (>= lg)

Flux principal (colonne gauche, ~ `lg:col-span-8`) :
- Branche A : NBA, `AccessGateBanner`/`FreePeriodBanner`, `ChecklistBlock`, `ConseilsDiscoveryCard`.
- Branche B : `SitterCockpit`, bloc erreurs, `AccessGateBanner`/`FreePeriodBanner`, `ChecklistBlock`, `DiscoverySections`, `ConseilsDiscoveryCard`.

Rail droit (colonne droite, ~ `lg:col-span-4`, `lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto`) :
- Branche A : `CommunityPulseBanner`, `SitterFirstNBA`-like « Prochain pas » repris depuis `ChecklistBlock`? Non : garder le `ChecklistBlock` dans le flux. Rail = `CommunityPulseBanner`, `NearbyHelpersCarousel` (déplacé, cf. risques), `EmailDigestCard`, `buildSecondaryAccordion()`.
- Branche B : `SitterActivityPanel` (KPI, « pouls perso »), `CommunityPulseBanner`, `EmailDigestCard`, `buildSecondaryAccordion()`.

`AlmaDock` reste géré par `AppLayout`, aucun déplacement.

Ce découpage correspond à la demande : flux = annonces/entraide/conseils ; rail = pouls du coin, prochain pas (KPI perso), accès/digest. Le « prochain pas » côté new-sitter reste en flux (ChecklistBlock) car c'est le CTA principal ; le rail porte plutôt le pouls et l'accès.

## 2. Point d'application du changement

Un seul fichier édité : `src/components/dashboard/SitterDashboard.tsx`.

Emplacement :
- Le wrapper `<div className="min-w-0">` ligne 470 devient le point où l'on introduit une grille conditionnelle desktop.
- Chaque branche (`isNewSitter` et sinon) enveloppe ses sections dans deux fragments internes `<main>` et `<aside>` avec classes :
  - conteneur : `lg:grid lg:grid-cols-12 lg:gap-6 lg:px-8`
  - flux : `lg:col-span-8 lg:min-w-0 space-y-6`
  - rail : `lg:col-span-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-4`

Garantie mobile inchangée :
- Aucune classe `grid` sans préfixe `lg:`. En dessous de `lg`, le conteneur reste un simple bloc, `<main>` et `<aside>` sont deux `<div>` empilés dans l'ordre exact d'aujourd'hui (flux puis rail = suite des sections actuelles).
- Aucun changement des `px-4 sm:px-5 md:px-8` internes, ni des marges verticales `mt-4/mt-6` actuellement portées par chaque wrapper. En mobile, la pile visuelle reste strictement identique.
- Les composants eux-mêmes ne sont pas modifiés (props inchangées).

## 3. Risques concrets

- **Duplication** : `NearbyHelpersCarousel` apparaît deux fois dans la branche B (une dans `DiscoverySections`, aucune ailleurs) et une fois dans la branche A. Le rail ne doit pas dupliquer ce carousel : je le laisse dans `DiscoverySections` côté B, et je le laisse dans le flux côté A (pas de déplacement au rail).
- **Sticky cassé** : un ancêtre avec `overflow-hidden` casse `position: sticky`. Ligne 455, le conteneur racine est `overflow-hidden`. Il faut retirer ce `overflow-hidden` uniquement pour desktop (`lg:overflow-visible`) sans changer le mobile, ou déplacer le sticky wrapper à l'intérieur d'un sous-conteneur `overflow-visible`. À valider en implémentation.
- **Carousel horizontal** dans le rail : `NearbyHelpersCarousel` s'étale sur toute la largeur, dans une colonne étroite il pourrait mal s'afficher. Solution : ne pas le mettre dans le rail (déjà arbitré ci-dessus).
- **Accordéon dans le rail** : `buildSecondaryAccordion` gère `defaultValue="reputation"` quand `completedSits > 0` ; ouvert dans une colonne étroite, il peut dépasser la hauteur viewport. Le rail est `overflow-y-auto`, donc scroll interne acceptable ; à surveiller visuellement.
- **États conditionnels** : `AccessGateBanner`/`FreePeriodBanner` de la branche B est conditionnel à `!nextGuard`. Il faut conserver le `!nextGuard` en gardant le bloc dans le flux, sans le remonter au rail. Idem pour le bloc erreurs (`nextGuardError || nearbyError`).
- **`CommunityPulseBanner`** : utilisé dans les deux branches, un seul montage par branche, aucun risque de double montage tant qu'on ne le laisse qu'au rail.
- **`SitterActivityPanel`** dans le rail : composant conçu large ; à vérifier qu'il ne casse pas visuellement en colonne 4/12. Fallback : le laisser en flux et ne mettre au rail que `CommunityPulseBanner` + `EmailDigestCard` + accordéon.
- **CTA sticky mobile** (`SitterMobileStickyCTA`) : hors flux/rail, non impacté.
- **Lien « Revoir la présentation »** (ligne 613) : reste hors grille, en pleine largeur sous les deux colonnes.

## 4. Hors périmètre, non touché

- Aucun hook, aucune requête, aucun calcul (`useSitterDashboardData`, `useSitterTopAffinitySits`, `useIsNewSitter`, Alma, etc.).
- Aucun composant enfant (`SitterCockpit`, `SitterActivityPanel`, `CommunityPulseBanner`, `NearbyHelpersCarousel`, `SitterMissionsSection`, `NearbyAnnoncesCard`, `SitterFirstNBA`, `EmailDigestCard`, `SitterBadgesSection`, `SitterStatusBar`, `SitterEmergencyCardCompact`, `ChecklistBlock` interne).
- Aucun texte éditorial, aucun libellé, aucun token de couleur.
- `AppLayout`, `BottomNav`, `AlmaDock`, `SitterMobileStickyCTA`.
- Le dashboard propriétaire.
- Le fichier `SitterDashboardSkeleton` (le skeleton reste tel quel, la grille desktop n'y est pas appliquée).

## Résumé
Une seule modification structurelle dans `SitterDashboard.tsx` : envelopper les sections de chaque branche dans un `<main>`/`<aside>` avec classes `lg:` pour former une grille 12 colonnes 8/4 uniquement à partir de `lg`, avec le rail en sticky. Mobile et tablette < lg strictement identiques.
