# Garde différentielle des tests

## Principe

La suite Vitest complète est exécutée, puis ses échecs sont comparés à la
référence figée dans `baseline.json` (18 échecs connus et tolérés au
14/08/2026, chacun documenté avec sa raison ; les deux blocs `it()`
homonymes de `notify-mission-event-invocations` comptent pour un seul
identifiant, d'où 18 entrées et non 19).

La garde échoue dans deux cas :

1. un échec **nouveau** apparaît (régression) ;
2. un test de la référence **se remet à passer** : il faut le retirer de
   `baseline.json`, sinon la référence pourrit.

Les fichiers listés dans `excludedFiles` dépendent du contenu de la base de
production et sont instables par nature en CI : ils sont ignorés dans les
deux sens (leur échec ou leur succès ne déclenche rien).

## Confirmation en isolation

Plusieurs gardes-fous sont des scans statiques (comptage de fichiers,
lecture disque) sensibles à la charge I/O du run complet : ils peuvent y
échouer de façon non reproductible (constaté le 14/08/2026 sur
`global-bottom-nav`, `i18n-single-storage-key`, `llms-txt-coverage`,
`no-unconsumed-supabase-call`, rouges en run complet et verts en isolation).

Tout écart (échec nouveau ou test de référence qui repasse) est donc rejoué
fichier par fichier, séquentiellement, avant verdict. Seul un écart
**reproductible en isolation** bloque la garde ; les écarts non
reproductibles sont listés en avertissement (préfixe `~`). Ce rejeu ne
coûte que lorsqu'il existe des écarts : un run sans écart n'est pas ralenti.

## Commandes

```bash
npm run test:guard                              # vérifie
node scripts/test-guard/diff-guard.mjs --update # régénère la référence
```

## Ce que la garde protège, et ce qu'elle ne protège pas

Le workflow GitHub (`.github/workflows/test-guard.yml`) exécute typecheck +
garde sur chaque push et pull request. C'est un **signal** visible sur GitHub.

**Il ne bloque pas la publication Lovable.** La publication Lovable est
construite et déployée par l'infrastructure Lovable, qui ne consulte pas les
checks GitHub. Un workflow rouge n'empêche aucun déploiement déclenché depuis
l'interface Lovable.

La seule porte réelle côté Lovable est le script `build` de `package.json` :
la publication l'exécute, et un code de sortie non nul fait échouer la
publication. **La garde y est câblée depuis le 17/08/2026** (décision du
propriétaire : un test rouge doit bloquer la publication) : `build` se
termine par `&& npm run test:guard`.

Conséquences :

- chaque publication gagne environ 1 à 2 minutes (suite complète, sans
  rejeu tant qu'il n'y a pas d'écart) ;
- les tests qui lisent la base de production (`article-internal-links`,
  `article-pricing-content`) sont dans `excludedFiles` : une donnée qui
  bouge en base ne fait jamais échouer un build. Ils restent à lancer à
  la main dans un environnement connecté ;
- les scans statiques sensibles à la charge I/O du run complet
  (`llms-txt-coverage`, `no-unconsumed-supabase-call`, `no-trial-wording`,
  `no-verified-sitter-claim`, `empty-state-style-isolation`) sont aussi
  dans `excludedFiles` : verts en isolation de façon reproductible, ils
  ne doivent pas bloquer une publication sur un faux négatif de charge.
