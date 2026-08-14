---
name: Garde différentielle des tests
description: baseline.json des 19 échecs tolérés, diff-guard.mjs, workflow GitHub. GitHub ne bloque PAS la publication Lovable ; seule porte réelle = script build.
type: feature
---

Mise en place le 14/08/2026.

- `scripts/test-guard/baseline.json` : 19 échecs connus tolérés (raison documentée pour chacun) + 2 fichiers exclus du périmètre (`article-internal-links`, `article-pricing-content`, dépendants de la base de production).
- `scripts/test-guard/diff-guard.mjs` (`npm run test:guard`) : échoue uniquement sur échec NOUVEAU ou sur test de référence qui repasse au vert (alors le retirer de la baseline, ou `--update`). Depuis le 14/08/2026 (soir) : tout écart est rejoué en isolation (fichier par fichier, séquentiel) avant verdict, car les gardes-fous à scan statique (`global-bottom-nav`, `i18n-single-storage-key`, `llms-txt-coverage`, `no-unconsumed-supabase-call`) échouent parfois sous la charge I/O du run complet sans être de vraies régressions. Seul un écart reproductible en isolation bloque.
- `.github/workflows/test-guard.yml` : typecheck (`npx tsc -b`) + garde sur push/PR.

**Limite honnête** : la publication Lovable court-circuite GitHub, un workflow rouge ne bloque aucun déploiement. La seule porte réelle est d'ajouter `&& npm run test:guard` au script `build` de package.json. Non câblé à ce jour (décision utilisateur en attente) : avant de câbler, exclure aussi les tests d'intégration réseau (`src/integration/__tests__/*`, etc.) qui liraient la base de production pendant le build.
