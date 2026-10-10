# Publication, diagnostic borné du 10/10/2026

## Preuves et limite

- Déploiement concerné : `71a56b5a-a166-4331-b190-121c349423e3`, source `7e56a724bedee5d2bde97ffbcf5b7d994ee3b069`.
- Le catalogue CLI n'expose que les diagnostics du build preview, pas les journaux des déploiements de publication. L'étape exacte bloquée du déploiement distant reste donc inconnue. L'erreur du précédent déploiement est générique et ne désigne aucune étape.
- Le script `build` enchaînait préparation HTML, robots, sitemap, Vite, puis `test:guard`.
- `test:guard` lance toute la suite Vitest avec `spawnSync`, sans timeout de processus, puis rejoue séquentiellement les fichiers présentant des écarts. Ce couplage est démontré par le code, pas par un journal de publication. Il peut prolonger ou faire échouer une publication après compilation réussie.
- Aucun rapport existant `vitest-guard-*` n'était disponible dans `/tmp`. Aucune suite générale n'a été relancée.
- Les lectures sitemap disposent d'une pagination contrôlée mais pas d'un délai réseau explicite. Un diagnostic lecture seule, avec timeout de 10 s par requête et 45 s global, a réussi en 0,85 s (collecte 0,434 s). Aucun blocage réseau reproduit, aucune modification du sitemap ou de sa stratégie de cache.

## Correctif minimal

- `package.json` : `build` conserve toutes les préétapes et Vite ; nouvelle commande `validate:ci` = `npm run build && npm run test:guard`.
- `.github/workflows/test-guard.yml` : appelle explicitement `validate:ci` après le typecheck.
- `scripts/test-guard/README.md` : décrit la séparation et précise que Lovable ne consulte pas les contrôles GitHub avant publication.
- `AGENTS.md` : règle de séparation ; `roadmap.md` : état de clôture.
- Baseline, exclusions, rejeux, verdicts et codes d'échec de la garde inchangés. La CI doit être verte avant publication manuelle ; aucune garantie de blocage automatique Lovable sur un contrôle GitHub rouge.

## Vérifications

- `timeout 15 node scripts/sync-index-html.mjs --check` : OK, 0,04 s, aucune écriture.
- `timeout 15 node scripts/generate-robots.mjs --check` : OK, 0,39 s, aucune écriture.
- `timeout 45 node /tmp/publication-diagnostic/probe.mjs` : lectures sitemap OK, 0,85 s, aucune écriture. Premier essai interrompu immédiatement sur un chemin d'import de diagnostic erroné, corrigé uniquement dans `/tmp`.
- Quatre assertions Node sur les commandes build/CI/garde : OK, moins d'une seconde.
- Journal automatique local : `build OK`, 16:14:20 UTC. Ce signal ne prouve pas une compilation distante de publication, ni son mode production. Pas de compilation manuelle supplémentaire, le harnais assure les builds.
- Version du correctif pipeline avant ce rapport : `3ec4b6d19b7171ee698609a1baf7a5289515cea0`.

Aucune publication, modification UI, donnée, permission ou action membre. Le prochain essai de publication appartient à Jérémie. Si le blocage persiste, son journal distant sera nécessaire pour distinguer compilation et hébergement.