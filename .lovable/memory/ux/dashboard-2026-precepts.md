---
name: Dashboard 2026 precepts (mobile + desktop)
description: Règles UX à appliquer aux dashboards owner/sitter, issues recherche NN/g, Baymard, Mobbin, Airbnb 2025/2026
type: preference
---

Référentiel à appliquer pour tout chantier sur `/dashboard`, `OwnerDashboard`, `SitterDashboard` et leurs sous-composants.

## Principes communs (mobile + desktop)

1. **1 tâche primaire visible** above the fold. Une seule NBA card dominante (`PriorityActionCard`), pas 4 surfaces concurrentes.
2. **Empty state 3-parties** obligatoire : statut + enseignement + 1 CTA. Jamais "Aucun résultat" ni grille vide.
3. **Skeleton screens** pour tout chargement > 500ms (jamais spinner générique).
4. **Source des recommandations affichée** : "Basé sur vos alertes Lyon · 15 km", pas "Recommandé pour vous".
5. **Greeting contextuel** (adapte le message selon stade : nouveau / actif / fidèle), pas un "Bonjour {prénom}" inerte.
6. **Empty state par rôle** : owner sans annonce ≠ sitter sans candidature. Jamais d'upsell sur un first-run empty state.

## Mobile (< md)

7. **Microsession <15s** : la home doit permettre vérifier notif / voir prochaine garde / lancer recherche sans plus d'1 scroll.
8. **Révéler les sections opérationnelles par défaut** (annonce, candidatures, prochaine garde, missions postulées). Masquer derrière toggle SEULEMENT : preuve sociale, badges, ressources, parrainage.
9. **Checklist activation 2-4 étapes**, non bloquante, dismissable, sur la home (pas en modal).
10. **Pas de grille vide** : remplir avec contenu éditorial / témoignages / chip "Créer une alerte" plutôt que placeholder.

## Desktop (≥ lg)

11. **Sidebar 256px / icon rail 64px** (déjà en place, protégée).
12. **KPI strip 4-6 cards** above the fold avec label court + chiffre hero + 1 comparaison + 1 visuel (sparkline OU delta OU trend, pas les 3).
13. **Choisir UNE shape par dashboard** :
    - Owner = **action-first** (que faire avec mes candidatures et ma prochaine garde)
    - Sitter = **activity-first** (qu'est-il arrivé : nouvelles annonces, messages, missions à proximité)
14. **Next-action hero** discret en haut SI urgence (candidatures à examiner, garde imminente), pas un KPI dominant.
15. **Aside utile** : si une colonne ne porte que 2 liens, la fusionner ou la transformer en KPI strip / résumé d'activité.

## Anti-patterns bannis

- 4 cartes "que faire" empilées (PriorityActionCard + NextActions + ActivationScore + TodoCard ensemble)
- Toggle "Voir tout mon espace" qui masque le cœur opérationnel mobile
- Sections dupliquées (NearbyHelpersCarousel + NearbyOwnerSittersCard, MissionsTabsCard + SitterMissionsSection)
- Greeting "Bonjour {prénom}" suivi d'un sous-titre qui répète mot pour mot le `PriorityActionCard`
- Empty state "Aucun résultat" sans chemin de retour
- Loading spinner générique au lieu de skeleton screens
- Upsell parrainage au même niveau visuel qu'une feature opérationnelle

## Sources

NN/g (empty states, recommendations, microsessions) · Baymard (cards dashboard, mobile UX 2025) · Joe Chiang Mobbin Study mai 2026 (3 shapes) · Art of Styleframe 2026 (sidebar 256px, KPI cards) · Pixxen 2026 (empty state patterns) · Airbnb Host 2025-2026 (action-first home, role switcher) · Linear/Stripe/Vercel (premium UI craft).
