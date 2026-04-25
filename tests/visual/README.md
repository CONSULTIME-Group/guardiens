# Tests de régression visuelle — `/sits/:id`

Capture pixel-à-pixel de la page de détail d'annonce dans **4 scénarios** clés
du cycle de vie : `draft`, `published`, `confirmed`, `completed`.

## Comment ça marche

1. **Mode Vite dédié `visual-test`** — Un alias dans `vite.config.ts` redirige :
   - `@/integrations/supabase/client` → `src/integrations/supabase/client.mock.ts`
     (proxy chainable qui renvoie les fixtures du scénario actif)
   - `@/contexts/AuthContext` → `src/contexts/AuthContext.mock.tsx`
     (useAuth() lit le scénario depuis l'URL `?scenario=...`)

2. **Fixtures statiques** — `tests/visual/fixtures.ts` contient un objet
   `SCENARIOS` indexé par identifiant. Chaque scénario décrit le sit, l'owner,
   la propriété, les animaux, les avis, les candidatures, et le profil du
   visiteur (owner ou sitter).

3. **Test Playwright** — `tests/visual/sit-detail.spec.ts` :
   - Lance `vite --mode visual-test --port 8765` dans `beforeAll`.
   - Pour chaque scénario, visite `/sits/<sitId>?scenario=<id>`,
     stabilise la page (fontes, animations désactivées) et capture.
   - Compare avec la baseline via `toMatchSnapshot()`
     (`maxDiffPixelRatio: 0.03`).

## Lancer

```bash
# Lance les tests (compare aux baselines existantes)
npx playwright test tests/visual/sit-detail.spec.ts

# Met à jour les baselines après changement délibéré
npx playwright test tests/visual/sit-detail.spec.ts --update-snapshots
```

Les captures fraîches sont écrites dans `test-results/sit-detail/<scenario>.png`.
Les baselines de référence sont stockées par Playwright à côté du fichier
`.spec.ts` dans `sit-detail.spec.ts-snapshots/`.

## Ajouter un scénario

1. Ajouter une entrée dans `SCENARIOS` (`tests/visual/fixtures.ts`).
2. Ajouter l'ID dans le tableau `scenarioIds` en haut du `.spec.ts`.
3. Lancer avec `--update-snapshots` une fois pour créer la baseline.

## Limitations connues

- Le mock Supabase est volontairement permissif : les tables non couvertes
  par les fixtures renvoient `{ data: [], error: null }`. Si un nouveau
  composant enfant attend une forme de donnée précise, étendre `getTableData`
  dans `client.mock.ts`.
- Les filtres `.gt/.lt/.gte/.lte/.or/.order` sont des no-ops dans le mock.
  Suffisant pour la régression visuelle ; ne pas réutiliser pour des tests
  fonctionnels.
- Les tests dépendent d'un environnement Playwright Lovable (présence de
  `lovable-agent-playwright-config`). Pas conçus pour CI standard hors
  plateforme.
