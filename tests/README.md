# Tests E2E Playwright

## `badges-long-labels.spec.ts`

Capture les sceaux de badges aux 3 vrais viewports (375 / 768 / 1920) avec un
vrai navigateur, ce qui contourne les limites d'`html2canvas` :
- vraies media queries Tailwind (`sm:` / `md:` / `lg:`)
- vraies polices (Outfit / Playfair) sans fallback système
- vraies animations Radix (gérées via `animations: "disabled"` au screenshot)

### Lancer

```bash
# Première fois — crée les baselines
npm run test:e2e:badges:update

# Runs suivants — compare aux baselines
npm run test:e2e:badges
```

### Sortie

- `test-results/badges/<viewport>/grille-*.png` — captures fraîches de la grille
- `test-results/badges/<viewport>/modale-<badge>-*.png` — captures de chaque modale
- `tests/badges-long-labels.spec.ts-snapshots/` — baselines versionnées
- En cas de diff > 2 % : Playwright génère un `*-diff.png` pour inspection.

### Pré-requis

L'app doit être lancée localement (`npm run dev`) ou la `baseURL` configurée
dans `playwright.config.ts` doit pointer vers une instance accessible.
