/**
 * Test E2E de régression visuelle pour /sits/:id.
 *
 * Mécanique :
 *  - Démarre un serveur Vite dédié en mode "visual-test" (alias vers les mocks
 *    Supabase + AuthContext) sur le port 8765.
 *  - Visite /sits/<sitId>?scenario=<scenarioId> pour 4 scénarios :
 *      draft-owner, published-owner, confirmed-owner, completed-owner.
 *  - Capture la page entière une fois stabilisée (animations désactivées,
 *    fonts chargées, network idle) et compare via toMatchSnapshot().
 *
 * Lancer :
 *   npx playwright test tests/visual/sit-detail.spec.ts
 *   npx playwright test tests/visual/sit-detail.spec.ts --update-snapshots
 */

import { test, expect } from "../../playwright-fixture";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { SCENARIOS, type ScenarioId } from "./fixtures";

const PORT = 8765;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = path.join(process.cwd(), "test-results", "sit-detail");

let viteProcess: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {
      // pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Vite n'a pas démarré sur ${url} en ${timeoutMs}ms`);
}

test.beforeAll(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });

  viteProcess = spawn(
    "npx",
    ["vite", "--mode", "visual-test", "--port", String(PORT), "--strictPort"],
    {
      cwd: process.cwd(),
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "development" },
    }
  );

  viteProcess.stdout?.on("data", (d) => {
    const s = d.toString();
    if (s.includes("error") || s.includes("Error")) console.log("[vite]", s);
  });
  viteProcess.stderr?.on("data", (d) => console.error("[vite:err]", d.toString()));

  await waitForServer(BASE_URL);
});

test.afterAll(async () => {
  if (viteProcess) {
    viteProcess.kill("SIGTERM");
    // laisse le port se libérer
    await new Promise((r) => setTimeout(r, 500));
  }
});

const scenarioIds: ScenarioId[] = [
  "draft-owner",
  "published-owner",
  "confirmed-owner",
  "completed-owner",
];

test.describe("Visual regression — /sits/:id", () => {
  test.setTimeout(60_000);

  for (const scenarioId of scenarioIds) {
    test(`scénario ${scenarioId}`, async ({ page }) => {
      const scn = SCENARIOS[scenarioId];
      const url = `${BASE_URL}/sits/${scn.sitId}?scenario=${scenarioId}`;

      // Désactive globalement les animations CSS et les transitions Radix.
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `,
      }).catch(() => {});

      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(url, { waitUntil: "networkidle" });

      // Attend que le titre de l'annonce soit présent (ou le message d'erreur)
      await page.waitForFunction(
        () => {
          const h1 = document.querySelector("h1, h2");
          return !!h1 && (h1.textContent || "").trim().length > 0;
        },
        { timeout: 15_000 }
      );

      // Stabilise : fonts + layout
      await page.evaluate(() => (document as any).fonts?.ready);
      await page.waitForTimeout(400);

      const screenshotPath = path.join(OUT_DIR, `${scenarioId}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
      });

      const buf = await fs.readFile(screenshotPath);
      expect(buf).toMatchSnapshot(`${scenarioId}.png`, {
        // Tolérance large pour absorber les différences de rendu fonts/anti-aliasing
        // entre machines. Un changement de layout réel dépassera largement ce seuil.
        maxDiffPixelRatio: 0.03,
      });
    });
  }
});
