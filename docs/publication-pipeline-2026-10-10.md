# Publication, diagnostic borné du 10/10/2026

## Preuves et limite

- Déploiement concerné : `71a56b5a-a166-4331-b190-121c349423e3`, source `7e56a724bedee5d2bde97ffbcf5b7d994ee3b069`.
- Le catalogue CLI n'expose que les diagnostics du build preview, pas les journaux des déploiements de publication. L'étape exacte bloquée du déploiement distant reste donc inconnue. L'erreur du précédent déploiement est générique et ne désigne aucune étape.
- Le script `build` enchaînait préparation HTML, robots, sitemap, Vite, puis `test:guard`.
- `test:guard` lance toute la suite Vitest avec `spawnSync`, sans timeout de processus, puis rejoue séquentiellement les fichiers présentant des écarts. Ce couplage est démontré par le code, pas par un journal de publication. Il peut prolonger ou faire échouer une publication après compilation réussie.
- Aucun rapport existant `vitest-guard-*` n'était disponible dans `/tmp`. Aucune suite générale n'a été relancée.
- Les lectures sitemap disposent d'une pagination contrôlée mais pas d'un délai réseau explicite. Un diagnostic lecture seule, avec timeout de 10 s par requête et 45 s global, a réussi en 0,85 s (collecte 0,434 s). Aucun blocage réseau reproduit, aucune modification du sitemap ou de sa stratégie de cache.

## Rectification à 16:15 UTC

- La séparation CI seule introduite dans `3ec4b6d19` est annulée : elle contrevenait à la décision propriétaire du 17/08. Ce n'était pas une correction démontrée de l'échec distant.
- `package.json` : `build` termine de nouveau par `npm run test:guard`, suppression de `validate:ci`.
- `.github/workflows/test-guard.yml` : appel original à `test:guard` rétabli.
- README et AGENTS : garde obligatoire à la publication rétablie ; roadmap corrigée.
- Baseline, exclusions, rejeux, verdicts et codes d'échec inchangés. Aucune cause distante démontrée, donc aucun autre correctif spéculatif.

## Vérifications

- `timeout 15 node scripts/sync-index-html.mjs --check` : OK, 0,04 s, aucune écriture.
- `timeout 15 node scripts/generate-robots.mjs --check` : OK, 0,39 s, aucune écriture.
- `timeout 45 node /tmp/publication-diagnostic/probe.mjs` : lectures sitemap OK, 0,85 s, aucune écriture. Premier essai interrompu immédiatement sur un chemin d'import de diagnostic erroné, corrigé uniquement dans `/tmp`.
- Quatre assertions antérieures sur la séparation : obsolètes après rectification, ne constituent pas une preuve de résolution.
- Journal automatique local : `build OK`, 16:14:20 UTC. Ce signal ne prouve pas une compilation distante de publication, ni son mode production. Pas de compilation manuelle supplémentaire, le harnais assure les builds.
- Version du correctif pipeline avant ce rapport : `3ec4b6d19b7171ee698609a1baf7a5289515cea0`.

Aucune publication, modification UI, donnée, permission ou action membre. Le prochain essai de publication appartient à Jérémie. Si le blocage persiste, son journal distant sera nécessaire pour distinguer compilation et hébergement.
## Cause distante confirmée (deploy 71a56b5a, 10/10/2026 16:18 UTC)

- Journaux : sync, robots, sitemap et Vite réussis ; `test:guard` sort 1 (4733 verts, 2 échecs dans fichiers exclus, 1 écart rejoué).
- Écart réel : `src/test/no-verified-sitter-claim.test.ts` ÉCHOUE (échec nouveau), il ne « passe désormais » pas. `knownFailures` est vide : aucune entrée à retirer, baseline.json inchangée.
- Cause : texte L5 de `IdentityVerifiedMark.tsx` (« contrôle à la main », « contrôle manuel ») interdit par le garde éditorial.
- Correctif : formulation « une personne de l'équipe revoit le dossier » ; intitulé du test L5 aligné. Inventaire du garde fait en Node (sans dépendre de `rg`).
- Vérification : les 2 fichiers de test lancés seuls, 44 verts. Suite générale non relancée ; un autre échec éventuel ne serait visible qu'à la prochaine publication.
