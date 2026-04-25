/**
 * Configuration Playwright.
 *
 * En production sur la plateforme Lovable, on utilise `createLovableConfig`.
 * En sandbox (package absent), on retombe sur une config Playwright standard
 * minimale suffisante pour exécuter les specs locales.
 */
import { defineConfig, devices } from "@playwright/test";
import { createRequire } from "node:module";

const requireFn = createRequire(import.meta.url);

let config: any;
try {
  const { createLovableConfig } = requireFn("lovable-agent-playwright-config/config");
  config = createLovableConfig({});
} catch {
  // Permet d'overrider le binaire Chromium via env var (utile en sandbox Nix
  // où les libs système attendues par le binaire Playwright manquent).
  const chromiumExec = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

  config = defineConfig({
    testDir: "./tests",
    timeout: 60_000,
    fullyParallel: false,
    workers: 1,
    reporter: "list",
    use: {
      headless: true,
      viewport: { width: 1280, height: 900 },
    },
    projects: [
      {
        name: "chromium",
        use: {
          ...devices["Desktop Chrome"],
          ...(chromiumExec ? { launchOptions: { executablePath: chromiumExec } } : {}),
        },
      },
    ],
  });
}

export default config;
