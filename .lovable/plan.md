
# Refonte Dashboards — Direction "Cockpit"

## Diagnostic actuel (ce qui ne marche pas)

**Sitter Dashboard**
- 5 blocs verticaux empilés au-dessus du pli (Hero + Checklist + FreePeriodBanner + NextGuard + StatusBar) → ~900px avant la première donnée actionnable.
- `SitterStatusBar` affiche 5 KPIs (profil%, sits, note, badges, candidatures) → pour un gardien à 0 sit, c'est **5 zéros = signal d'inutilité**.
- `SitterEmergencyCard` occupe ~200px pour une fonction conditionnelle (CTA compléter) qui ne s'applique qu'à une minorité.
- Ton **institutionnel** (informatif, neutre) plutôt qu'**incitatif** (verbe d'action, prochaine étape claire).

**Owner Dashboard**
- Symétriquement : trop de cartes "métier" (annonces, missions, candidats, conseils) en parallèle, aucune hiérarchie d'urgence.
- L'œil ne sait pas où aller en premier.

## Principe directeur

**Un dashboard répond à 3 questions, dans cet ordre :**
1. **Où en suis-je ?** → 1 métrique signature (pas 5)
2. **Que dois-je faire MAINTENANT ?** → 1 action prioritaire, contextuelle, urgente
3. **Qu'est-ce qui se passe autour ?** → 1 signal de vie (preuve sociale, opportunité fraîche)

Tout le reste descend sous le pli.

## Wireframe — Sitter Cockpit (mobile-first)

```text
┌─────────────────────────────────────────┐
│  Bonjour Jérémie  ·  Gardien · niveau 1 │ ← Greeting condensé
│  ─────────────────────────────────────  │
│  🟢 Disponible  [toggle]                │ ← 1 ligne, switch visible
├─────────────────────────────────────────┤
│  PROCHAINE ÉTAPE                        │ ← eyebrow contextuel
│  Vous êtes à 2 candidatures             │
│  d'un statut Super Sitter.              │ ← phrase narrative
│  ┌─────────────────────────────────┐    │
│  │  Voir les annonces près de moi  │ →  │ ← 1 CTA primary unique
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  🔴 LIVE · 121 gardiens actifs ce       │ ← signal vivant (pulse)
│  matin · 12 annonces nouvelles 24h      │
└─────────────────────────────────────────┘

Sous le pli (inchangé) :
  - Découverte (Annonces / Coup de main / Conseils)
  - Réputation détaillée (ancien StatusBar, dans un Accordion fermé)
  - Emergency Card (collapsée en 1 ligne avec lien "Configurer →")
  - Badges (déjà condensé)
```

## Wireframe — Owner Cockpit

```text
┌─────────────────────────────────────────┐
│  Bonjour Marie  ·  Propriétaire         │
├─────────────────────────────────────────┤
│  À ACTION                               │
│  3 candidats vous attendent             │ ← compteur sémantique
│  sur votre annonce "Maison à Annecy"    │
│  ┌─────────────────────────────────┐    │
│  │  Examiner les candidatures      │ →  │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  🔴 LIVE · 4 gardiens vérifiés à <30km  │
│  cherchent une garde cette semaine      │
└─────────────────────────────────────────┘

Sous le pli :
  - Mes annonces (cartes)
  - Coup de main
  - Réputation/Avis reçus
```

## Règles de calcul de "l'action prioritaire"

**Sitter** (priorité décroissante) :
1. NextGuard programmée → "Garde dans X jours · préparer"
2. Candidature acceptée non vue → "Confirmer votre venue"
3. Profil < 60% → "Compléter votre profil pour être visible"
4. 0 candidature 30j → "Postuler à une annonce proche"
5. Par défaut → "Voir les annonces près de moi"

**Owner** (priorité décroissante) :
1. Candidatures en attente → "Examiner X candidats"
2. Annonce expirant <7j → "Renouveler votre annonce"
3. Aucune annonce → "Publier votre première annonce"
4. Sit confirmé → "Préparer l'arrivée du gardien"
5. Par défaut → "Voir les gardiens proches"

## Composants à créer / modifier

**Nouveaux**
- `src/components/dashboard/sitter/SitterCockpit.tsx` — bloc unifié
- `src/components/dashboard/owner/OwnerCockpit.tsx`
- `src/components/dashboard/shared/LiveSignalStrip.tsx` — pulse + compteurs
- `src/components/dashboard/shared/PriorityActionCard.tsx` — narration + CTA
- `src/hooks/useSitterPriorityAction.ts` / `useOwnerPriorityAction.ts` — calcul règle

**Supprimés du haut de pli (déplacés sous le pli)**
- `SitterHero` → fusionné dans Cockpit (greeting + toggle)
- `SitterStatusBar` → déplacé dans Accordion "Ma réputation détaillée"
- `SitterEmergencyCard` → collapsé en 1 ligne sous le pli
- `SitterNextGuard` → fusionné dans PriorityActionCard quand applicable
- `NearestListingHero` → fusionné dans PriorityActionCard
- `FreePeriodBanner` → déplacé en footer du Cockpit (1 ligne)

**Conservés strictement inchangés** (sidebar protégé, role toggle)

## Custom_skills pastilles

Vérification : déjà en pills dans `HelperMiniCard` (l.239). Ce que vous voyez probablement comme "texte" = la bio italique serif ("« texte »"). À confirmer avec capture. Sinon je ne touche pas.

## Risques

- **[P] Calcul "prochaine étape" complexe** : la règle priorisée nécessite 4-5 requêtes que `useSitterDashboardData` fait déjà. Réutiliser, pas dupliquer.
- **[C] Changement disruptif** : utilisateurs habitués au layout actuel peuvent être perdus. Mitigation : pas de période transitoire, conviction.
- **[M] LiveSignalStrip** : nécessite count gardiens actifs + nouvelles annonces 24h. La 1re existe déjà (`useActiveSittersCount`), la 2e est à créer.
- **[R] Ton "incitatif"** sans devenir agressif/SaaS : narration en vouvoiement, factuelle, pas de "🚀 Boostez vos performances !". Inspiration : New York Times reader dashboard, pas Notion.

## Livrables de cette passe

1. Cockpit gardien (composant + hook + intégration dans `SitterDashboard.tsx`)
2. Cockpit proprio (composant + hook + intégration dans `OwnerDashboard.tsx`)
3. LiveSignalStrip partagé
4. Migration des blocs déplacés sous le pli (Accordion réputation, Emergency 1-line)

**Hors scope explicite** : redesign des cartes sous le pli (Annonces, Coup de main, Conseils — déjà travaillées).

## Validation demandée

Si vous validez ce plan, je commence par le **Sitter Cockpit** (le plus critique), je vous montre, vous validez visuellement, puis je décline sur Owner. Pas tout d'un coup.
