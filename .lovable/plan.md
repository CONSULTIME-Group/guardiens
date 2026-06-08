## Périmètre (hors tarifs, gratuité préservée)

Vous avez raison, on garde la promesse « à 0 € jusqu'au 14 juillet 2026 » partout. Je n'enlève rien à ce sujet, j'ajuste juste les wordings qui parlent encore de prix payant comme si c'était actif aujourd'hui.

## Vague 1, quick wins safe (ce tour)

1. **PremiumGateDialog** : rendre le wording free-period aware via `isInGracePeriod()` / `isBeforeLaunch()`. Affiche « Activer mon espace gardien, à 0 € en ce moment » pendant la gratuité, sinon « 6,99 €/mois sans engagement ». Supprime « essayer sans frais » ambigu.
2. **Typographie tarifs** : ajouter `font-display tabular-nums` sur les prix dans `PricingCards.tsx` et `PricingCardsCheckout.tsx`.
3. **Analytics `cta_click`** : helper `trackCtaClick(name, location)` dans `src/lib/analytics.ts`, branché sur 3 CTAs primaires (Hero principal, PremiumGate, RoleActivationBanner).

## Vague 2, UX/UI (tour suivant, après votre OK)

4. Hero : CTA unique primaire, secondaire en `ghost`.
5. Hero : micro social proof (37 familles, 234 animaux, 4.9/5) avec composant existant si dispo.
6. Sticky CTA mobile sur `SitDetail` et `SitterProfile`.
7. Empty states : remplacer Lucide par gouaches existantes (audit ciblé).
8. Favoris : bouton flottant `SitDetail`.

## Vague 3, SEO (tour suivant)

9. CityPage : bloc « Villes proches » + JSON-LD `Service` avec `areaServed`.
10. SitDetail images : `loading="lazy"` + `fetchpriority="low"` sauf cover.
11. Sitemap : `lastmod` dynamique par article.
12. Article pilier « Combien coûte un gardien d'animaux à domicile en France en 2026 ? » (rédaction = gros morceau, à confirmer ton/longueur).

## Hors scope explicite

- Toute mention « 6,99 € » présentée comme prix actif sans condition de date, KO. On garde la double formulation conditionnelle partout.
- Renommer « sit/sitter » en « garde/gardien » côté UI : prévu mais en lot dédié (risque de régression i18n / tests), pas mélangé avec le reste.

## Validation

Tests Vitest existants (`no-trial-wording`, `free-period-dates-consistency`, `pricing-oneshot-consistency`) doivent rester verts à chaque vague.

Je commence par la Vague 1 dès votre feu vert, ou je file direct si vous me dites « go ».
