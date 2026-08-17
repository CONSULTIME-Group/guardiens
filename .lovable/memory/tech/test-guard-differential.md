---
name: Garde différentielle des tests
description: baseline.json vide, diff-guard.mjs, workflow GitHub, câblée au build. Exclusions résiduelles = 2 tests dépendants de la base de production, relançables via npm run test:data.
type: feature
---

Mise en place le 14/08/2026, cause racine des faux négatifs corrigée le 17/08/2026.

- `scripts/test-guard/baseline.json` : `knownFailures` vide (suite entièrement verte). Seuls 2 fichiers restent dans `excludedFiles` : `article-internal-links` et `article-pricing-content`, dépendants du contenu de la base de production. Ils se relancent à la main via `npm run test:data` après toute modification du contenu des articles en production.
- `scripts/test-guard/diff-guard.mjs` (`npm run test:guard`) : échoue uniquement sur échec NOUVEAU ou sur test de référence qui repasse au vert. Tout écart est rejoué en isolation (fichier par fichier, séquentiel) avant verdict : seul un écart reproductible en isolation bloque. Ce rejeu est conservé comme filet de sécurité anti-flaky.
- **Câblée au build depuis le 17/08/2026** : `build` de package.json se termine par `&& npm run test:guard`. C'est la seule porte réelle : la publication Lovable ne consulte pas les checks GitHub.
- `.github/workflows/test-guard.yml` : typecheck (`npx tsc -b`) + garde sur push/PR, signal uniquement.

**Cause racine des timeouts du 17/08/2026 (à ne pas réintroduire)** : les 5 gardes à scan statique (`llms-txt-coverage`, `no-unconsumed-supabase-call`, `no-trial-wording`, `no-verified-sitter-claim`, `empty-state-style-isolation`) mourraient en run complet sur « Test timed out in 5000ms » parce que leurs `it()` relançaient l'inventaire disque + la lecture de ~1500 fichiers sous charge I/O. Correction : inventaire et contenus lus UNE fois au chargement du module (phase de collecte, hors testTimeout), les `it()` n'opèrent que sur des chaînes en mémoire. Elles ont été réintégrées au périmètre et la suite a été vérifiée verte 3 fois de suite + garde OK. Règle durable : **jamais d'I/O disque exhaustive dans un `it()`** ; la lire au niveau module/describe.

Également corrigé le 17/08/2026 : le mock Supabase de `useSitterProfile.mobility.test.tsx` n'exposait pas `auth.getUser`, ce qui produisait 4 « Unhandled Rejection » et un exit code 1 du run complet malgré zéro échec de test.
