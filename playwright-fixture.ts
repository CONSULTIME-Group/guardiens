/**
 * Fixture Playwright partagée.
 *
 * En production sur la plateforme Lovable, le package
 * `lovable-agent-playwright-config` est disponible et fournit ses propres
 * `test`/`expect`. En sandbox local (CI hors plateforme), il peut être absent —
 * on retombe alors sur le `test`/`expect` natif de `@playwright/test`.
 *
 * Ce fallback permet d'exécuter les tests visuels sans dépendre de l'outillage
 * spécifique à Lovable.
 */
let exported: { test: any; expect: any };

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  exported = require("lovable-agent-playwright-config/fixture");
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  exported = require("@playwright/test");
}

export const test = exported.test;
export const expect = exported.expect;
