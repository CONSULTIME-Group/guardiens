
# Audit organisation & présentation, profils publics

Lecture seule, aucune modification de code. Focus architecture de l'information, hiérarchie visuelle et cohérence de marque.

## Localisation

- **Page unifiée** : `src/pages/PublicSitterProfile.tsx` (2 387 lignes) sert à la fois gardien, propriétaire et entraide via l'état `activeTab`.
- **Routes** :
  - `/gardiens/:id` → `PublicSitterProfile` (défaut onglet gardien)
  - `/proprietaires/:id` → redirection technique vers `/gardiens/:id?tab=proprio`
  - `/annonces/:id` → `PublicSitDetail.tsx` (fiche annonce, encart owner en sidebar)
- **Hero commun** : L1000-1157 (avatar + prénom + badges + TrustScore + CTA hero).
- **Barre onglets rôle** : L1194-1257 (Gardien / Propriétaire / Entraide).
- **Contenu gardien** : L1262-1779 (4 tuiles + CTA, puis Tabs : À propos, Avis, Pratique, Galerie, Confiance).
- **Contenu propriétaire** : L1783-2087+ (hero compact secondaire L1786-1828, sous-onglets À propos, Avis, Animaux, Gardes, Galerie).
- **CTA sticky bottom mobile** : L1741-1777, **présent uniquement dans l'onglet Gardien**.

## Diagnostic présentation actuelle

### Ce qu'on voit above the fold

**Gardien** (bon) : illustration hero, avatar large avec `StatutGardienBadge`, badge « Disponible » animé, pastille opaque prénom + note + favori + badges pro/fondateur, ville, `ReplyTimeBadge`, chips « Abonné / ID vérifiée / Fondateur / Urgence », `TrustScore`, éventuel Alma, puis stats. En 2 s, on comprend qui, la confiance, et où contacter (le CTA principal reste sous les 4 tuiles, pas dans le hero).

**Propriétaire** (faible) : le hero commun premium disparaît. Une fois sur `?tab=proprio`, on retombe sur un **hero compact secondaire** (L1787-1828) : avatar 56 px, prénom H2 (pas H1), 2 mini-badges, ville, note. **Pas de TrustScore, pas de CTA, pas de badge disponibilité, pas de bandeau de qualification.** Le proprio a l'air d'un onglet secondaire d'un gardien, pas d'une personne à part entière.

### Architecture de l'information

**Gardien** (L1263-1779) :
1. Bandeau qualification rapide : 4 tuiles (Animaux, Zone, Disponibilité, Confiance) + CTA
2. Tabs (desktop) / onglets sticky scrollables (mobile) : À propos, Avis, Pratique, Galerie, Confiance
3. Dans « Avis » : encore des sous-onglets Gardes / Missions
4. CTA sticky bottom mobile

**Propriétaire** (L1830-2087+) :
1. Hero compact
2. Sous-onglets sticky : À propos, Avis, Animaux, Gardes, Galerie
3. Aucun CTA sticky, aucun bandeau de qualification équivalent aux 4 tuiles gardien

### Problèmes structurels majeurs

1. **Triple niveau d'onglets côté gardien** : rôle (Gardien/Proprio/Entraide) → contenu (5 tabs) → dans Avis, encore Gardes/Missions. Le visiteur perd le fil et rate souvent l'onglet **Confiance** (badges, timeline, ID) alors que c'est **la** section rassurante clé, aujourd'hui cachée en dernière position derrière un clic.
2. **Deux hero de niveaux très différents** entre gardien et proprio → rupture de marque forte. Un proprio n'a droit ni à l'illustration, ni au TrustScore, ni au CTA hero.
3. **Onglet Propriétaire branché sur une URL « /gardiens/:id »** : c'est déroutant conceptuellement (« pourquoi ma page est sur /gardiens ? ») et sémantiquement (SEO, partage, breadcrumb).
4. **Pas de bandeau qualification proprio** : côté gardien on a 4 tuiles synthétiques (animaux, zone, dispo, confiance). Côté proprio, il n'y a rien d'équivalent (nombre d'animaux, environnement, ancienneté, avis reçus, écussons) → le proprio paraît « pas fini ».
5. **Owner sans annonce** : la page proprio existe mais l'onglet « Gardes » est vide, aucune amorce de réassurance (« Ce propriétaire prépare sa première annonce », « Voir son profil et ses animaux »). Impression de coquille vide.
6. **CTA proprio absent en sticky mobile** : sur mobile, un gardien qui visite un proprio n'a **aucun** bouton contacter à portée. Le CTA n'existe que pour l'onglet Gardien (L1742).
7. **Signaux de confiance mal placés côté gardien** : `TrustScore` est dans le hero (bien), mais Écussons + Timeline + ID détaillée sont noyés dans un onglet « Confiance » optionnel. Un visiteur qui reste sur « À propos » ne les voit jamais.
8. **Ordre des onglets gardien** : À propos, Avis, Pratique, Galerie, Confiance. « Pratique » (tarifs, zone, compétences) est **la** page utile de décision, elle est en 3ᵉ position derrière « À propos » plutôt éditorial. Les avis (preuves sociales) devraient précéder « Pratique », ce qui est déjà le cas, mais « Confiance » devrait remonter avant « Galerie ».
9. **Cohérence typographique** : gardien utilise `text-2xl sm:text-3xl md:text-4xl font-heading` pour H1, proprio `text-lg` pour H2 → écart énorme. Les libellés d'onglets et le corps sont eux plutôt cohérents.
10. **Mobile <= 400 px** : hiérarchie préservée globalement (stats strip scrollable, onglets scrollables), mais l'empilement 4 tuiles → CTA → onglets → contenu → CTA sticky consomme beaucoup de scroll avant d'arriver aux avis.

## Proposition d'organisation cible

### Décision de fond sur les onglets rôle

**Garder** l'onglet rôle Gardien / Propriétaire / Entraide (utile pour les dual-role). Mais :
- Ce sont des **rôles d'une même personne**, pas des pages différentes. Donc le **hero commun premium** (avatar + illustration + TrustScore + CTA) doit être **identique** peu importe l'onglet actif.
- Le hero compact proprio actuel (L1787-1828) doit disparaître au profit du hero commun.

### Ordre above the fold, unifié gardien + proprio

1. Illustration hero (déjà là)
2. Avatar large + statut (StatutGardien pour sitter, équivalent « Propriétaire vérifié » pour owner)
3. Pastille prénom + note + favori + badges (fondateur, ID vérifiée, abonné)
4. Ville : « Gardien à X » / « Propriétaire à X » / « Gardien et propriétaire à X »
5. TrustScore (identique pour les deux rôles)
6. **CTA hero** (Contacter / S'inscrire) : à monter ici, plus visible que sous les 4 tuiles

### Ordre des sections idéal, après hero

**Gardien** :
1. Bandeau 4 tuiles (Animaux, Zone, Dispo, Confiance) — garder
2. Avis (preuve sociale d'abord)
3. Pratique (tarifs, compétences, savoir-faire)
4. Confiance étendue (badges, timeline, ID détail, expériences externes)
5. À propos (bio, motivation) — dégrader en dernier, c'est le plus « décoratif »
6. Galerie (accessoire)

**Propriétaire** :
1. Bandeau 4 tuiles équivalent : Animaux (nombre + espèces), Environnement, Ancienneté + gardes publiées, Confiance (avis + écussons)
2. Animaux (le sujet central du proprio)
3. Avis reçus des gardiens
4. Gardes publiées (cliquables, comme corrigé récemment)
5. À propos (welcome_notes + bio)
6. Confiance / écussons

### Faut-il garder les onglets contenu ?

- **Sur desktop** : passer en **page longue avec ancres** plutôt qu'onglets. Un profil doit se lire, pas se cliquer. Les onglets desktop cachent la moitié de la page (surtout Confiance) et cassent le SEO comportemental. Garder une **table des matières sticky** à gauche/en haut avec les 5-6 sections.
- **Sur mobile** : garder les onglets sticky scrollables (space budget serré), mais **ajouter un onglet « Confiance » actif par défaut si le visiteur arrive depuis un CTA « Voir les vérifications »**, sinon « Avis » par défaut (pas « À propos »).
- **Éliminer le 3ᵉ niveau d'onglets** dans « Avis » (Gardes/Missions) : afficher les deux listes empilées avec un filtre à puces (« Gardes 5 · Missions 2 ») plutôt que des sous-tabs Radix.

### Traiter le cas propriétaire à égalité

- Hero commun premium (voir ci-dessus).
- Bandeau 4 tuiles proprio.
- **CTA sticky mobile** activé aussi sur l'onglet proprio.
- **Owner sans annonce** : bloc soigné « [Prénom] prépare sa première garde. En attendant, découvrez ses animaux et son environnement. » + mise en avant Animaux et Environnement.
- Optionnel : renommer la route publique proprio en `/proprietaires/:id` **direct** (sans redirect) avec le même composant et un `title`/`breadcrumb` cohérent.

## Tableau récapitulatif

| Zone | Problème de présentation | Sévérité | Reco |
|---|---|---|---|
| Hero proprio (L1787-1828) | Hero compact 56 px, pas de TrustScore, pas de CTA, pas de badges hero, aucune illustration | **Bloquant** | Utiliser le hero commun premium (L1000-1157) pour les deux rôles |
| Onglet Confiance (L1580-1605) | Section clé (badges + timeline + ID) cachée en dernière position derrière un clic | **Bloquant** | Sortir en section longue par défaut sur desktop, remonter avant Galerie sur mobile |
| CTA gardien (L1391-1439) | Placé sous les 4 tuiles, pas visible above the fold | Moyen | Remonter dans le hero à côté du prénom + favori |
| CTA proprio | Absent en sticky bottom mobile (L1742 uniquement onglet gardien) | **Bloquant** | Dupliquer le sticky bottom pour l'onglet proprio (« Contacter X ») |
| Bandeau qualification proprio | Absent, alors que le gardien en a 4 tuiles synthétiques | **Bloquant** | Ajouter 4 tuiles proprio (Animaux, Environnement, Ancienneté, Avis + écussons) |
| Onglets contenu desktop (L1444-1607) | 3 niveaux d'onglets sur gardien, contenu Confiance/Galerie souvent raté | Moyen | Passer en page longue avec table des matières sticky sur desktop |
| Sous-onglets Avis Gardes/Missions (L1512-1548, L1658-1686) | 3ᵉ niveau de nesting, pénible et redondant | Moyen | Une seule liste chronologique avec filtre chips « Gardes · Missions · Tous » |
| Owner sans annonce | Onglet Gardes vide sans réassurance | Moyen | Empty state éditorial + mise en avant Animaux/Environnement |
| Route `/gardiens/:id?tab=proprio` | Un proprio hébergé sur une URL « gardiens », déroutant + SEO ambigu | Moyen | Servir directement sur `/proprietaires/:id` sans redirect, même composant |
| H1 vs H2 gardien/proprio | H1 4xl côté gardien vs H2 lg côté proprio, rupture de marque | Moyen | Même H1 pour les deux rôles via hero unifié |
| Ordre onglets gardien | « À propos » avant « Pratique » et « Confiance » | Cosmétique | Réordonner : Avis, Pratique, Confiance, À propos, Galerie |
| Stats strip mobile (L1163-1191) | Doublon partiel avec les 4 tuiles gardien | Cosmétique | Fusionner : stats strip = version condensée des tuiles, pas les deux |

## 5 changements prioritaires

1. **Hero unifié pour les deux rôles** : le proprio a droit au même hero premium (avatar large, TrustScore, badges, CTA à hauteur du nom). Supprimer le hero compact L1786-1828 et adapter les libellés (« Propriétaire à X », statut proprio).
2. **CTA sticky bottom mobile actif sur l'onglet proprio** aussi. Aujourd'hui un gardien mobile ne peut pas contacter un proprio sans scroller chercher un bouton.
3. **Bandeau 4 tuiles proprio** en tête de contenu (Animaux, Environnement, Ancienneté + gardes, Avis + écussons), miroir du bandeau gardien. Le proprio arrête d'avoir l'air « pas fini ».
4. **Signaux de confiance sortis de leur onglet** : sur desktop, page longue avec section Confiance visible sans clic ; sur mobile, remonter l'onglet Confiance en 2ᵉ position (juste après Avis) et le rendre systématiquement présent.
5. **Un seul niveau d'onglets « Avis »** : remplacer les sous-tabs Gardes/Missions par un filtre chips + liste unique triée par date. Réduit à 2 le nombre max de niveaux d'onglets vus par un visiteur.

Cible : profils clairs (un seul hero de marque), rassurants (confiance visible sans clic, CTA toujours accessible) et cohérents (proprio et gardien traités à égalité, même typographie, même densité).
