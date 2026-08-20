# Affinité, règle définitive : « tri, on filtre jamais »

Décision de Jérémie, 20/08/2026. Règle définitive, sans constante d'arbitrage ni bascule, partout (UI et SQL).

## Aucun filtre de pool

Aucun critère de confiance n'exclut un gardien d'un vivier : identité vérifiée, complétude du profil, ancienneté, note, abonnement. Tout ça se TRIE et s'affiche en badge, rien de tout ça ne FILTRE.

- Seules exclusions admises : incompatibilité déclarée en distribution sortante (allergie déclarée, refus d'espèce) et critères de délivrabilité et consentement (compte actif, opt-in, non supprimé, dans le rayon déclaré).
- Seules hygiènes de pool admises : compte actif, hors soi-même, rôle gardien ou polyvalent.
- Seuil 60 % : applique UNIQUEMENT au bouton « candidater ». Le gardien sous le seuil reçoit les mêmes annonces, même ordre, voit la page de l'annonce. CTA invitant à compléter, alimenté par la fonction SQL `sitter_missing_opportunities`.
- La règle vaut aussi pour les compteurs : `count_eligible_sitters`, `admin_liquidity_snapshot`, `count_mission_notification_audience` comptent le vivier réel, sans filtre de confiance, sinon les chiffres mentent sur la distribution.

## Plafonds jamais silencieux

Tout plafond (lecture, scoring, affichage) : trier d'abord, plafonner ensuite, et journaliser (console.info / console.warn / RAISE NOTICE) le nombre de profils écartés. Interdit : `.limit(n)` avant tri, `slice` avant tri.

## Ordre de tri du Top 3 propriétaire

1. Score d'affinité décroissant (moteur unique `computeAffinityResultFull`).
2. Identité vérifiée avant non vérifiée, à score égal.
3. Distance croissante (coord approx, ville en repli, NULL en fin de liste).

## Moteur unique

Un seul calcul partagé client et Edge : `supabase/functions/_shared/affinity/`. `src/lib/affinityScore.ts` ré-exporte. `calculate_affinity_score_pg` et `get_owner_top_3_sitters` sont dépréciées (COMMENT ON, plus aucun appelant). Test de parité : le score servi à l'affichage est strictement égal à celui de la distribution.

## Mesure avant / après (20/08/2026)

Le filtre identité vérifiée + complétude 60 % excluait 934 gardiens sur 990 (94 %). Pool du Top 3 passé de 56 à environ 990 pour chaque propriétaire mesuré (11 lignes nominatives produites, Jennifer, Catherine, Marion, Isabelle, Géraldine, Tristan, Lisa, Hélène, Nathalie, Christel, Ophélya).

## Garde-fou

`src/__tests__/top3-trust-policy.test.ts` (9 tests) verrouille : aucune constante d'arbitrage, aucun filtre identité / complétude, ordre de tri exact, plafonds tracés, badge « Identité vérifiée » affiché, section jamais vide dès 1 candidat.
