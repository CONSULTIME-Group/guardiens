/**
 * Fixture Playwright partagée.
 *
 * En production sur la plateforme Lovable, le package
 * `lovable-agent-playwright-config` est disponible et fournit ses propres
 * `test`/`expect`. En sandbox local (CI hors plateforme), il peut être absent —
 * on retombe alors sur le `test`/`expect` natif de `@playwright/test`.
 *
 * Implémentation via `createRequire` car ce fichier est en ESM mais on a
 * besoin de résolution synchrone (les `export` doivent exister à l'évaluation).
 */
import { createRequire } from "node:module";

const requireFn = createRequire(import.meta.url);

let exported: { test: any; expect: any };
try {
  exported = requireFn("lovable-agent-playwright-config/fixture");
} catch {
  exported = requireFn("@playwright/test");
}

export const test = exported.test;
export const expect = exported.expect;
