/**
 * Tests d'accessibilité pour /sits/:id sur les 4 scénarios.
 *
 * Vérifie :
 *  1. Aucun élément focusable (button, a, input, [tabindex>=0]) n'est caché
 *     visuellement (display:none / visibility:hidden / aria-hidden=true ancestor)
 *     tout en restant atteignable au clavier.
 *  2. Les sections clés portent bien un libellé accessible :
 *      - Au moins un <h1>
 *      - <main> ou role=main présent
 *      - TabsList avec aria-label="Sections de l'annonce"
 *      - Les onglets actifs/inactifs ont aria-selected
 *      - Pour le sitter : <aside> avec aria-label sur la barre d'action
 *
 * Réutilise le serveur Vite "visual-test" (port 8766 pour ne pas entrer
 * en conflit avec sit-detail.spec.ts).
 */

import { test, expect } from "../../playwright-fixture";
import { spawn, type ChildProcess } from "node:child_process";
import { SCENARIOS, type ScenarioId } from "./fixtures";

const PORT = 8766;
const BASE_URL = `http://localhost:${PORT}`;

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
  viteProcess = spawn(
    "npx",
    ["vite", "--mode", "visual-test", "--port", String(PORT), "--strictPort"],
    {
      cwd: process.cwd(),
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "development" },
    }
  );

  viteProcess.stderr?.on("data", (d) => console.error("[vite:err]", d.toString()));
  await waitForServer(BASE_URL);
});

test.afterAll(async () => {
  if (viteProcess) {
    viteProcess.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
  }
});

const scenarioIds: ScenarioId[] = [
  "draft-owner",
  "published-owner",
  "cancelled-sitter",
  "completed-sitter",
];

test.describe("Accessibilité — /sits/:id", () => {
  test.setTimeout(60_000);

  for (const scenarioId of scenarioIds) {
    test(`a11y — ${scenarioId}`, async ({ page }) => {
      const scn = SCENARIOS[scenarioId];
      const url = `${BASE_URL}/sits/${scn.sitId}?scenario=${scenarioId}`;

      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(url, { waitUntil: "networkidle" });

      await page.waitForFunction(
        () => {
          const h1 = document.querySelector("h1, h2");
          return !!h1 && (h1.textContent || "").trim().length > 0;
        },
        { timeout: 15_000 }
      );

      // ---------- 1. Focusables cachés ----------
      const hiddenFocusables = await page.evaluate(() => {
        const selector = [
          "a[href]",
          "button:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          '[tabindex]:not([tabindex="-1"])',
        ].join(",");

        const isVisuallyHidden = (el: Element): string | null => {
          let node: Element | null = el;
          while (node && node !== document.body) {
            const style = window.getComputedStyle(node);
            if (style.display === "none") return "display:none";
            if (style.visibility === "hidden") return "visibility:hidden";
            if (node.getAttribute("aria-hidden") === "true") return "aria-hidden=true ancestor";
            node = node.parentElement;
          }
          // pointer-events:none seul est OK (état décoratif), on ne le compte pas
          return null;
        };

        const offending: { tag: string; text: string; reason: string }[] = [];
        document.querySelectorAll(selector).forEach((el) => {
          // Ignore les éléments .sr-only (visuellement cachés mais accessibles aux SR — légitime)
          if (el.classList.contains("sr-only")) return;
          const reason = isVisuallyHidden(el);
          if (reason) {
            offending.push({
              tag: el.tagName.toLowerCase(),
              text: (el.textContent || "").trim().slice(0, 60),
              reason,
            });
          }
        });
        return offending;
      });

      expect(
        hiddenFocusables,
        `Éléments focusables cachés détectés:\n${JSON.stringify(hiddenFocusables, null, 2)}`
      ).toEqual([]);

      // ---------- 2. Libellés des sections clés ----------

      // 2a. Au moins un h1
      const h1Count = await page.locator("h1").count();
      expect(h1Count, "Doit avoir au moins un <h1>").toBeGreaterThanOrEqual(1);

      // 2b. <main> ou role=main
      const mainCount = await page.locator('main, [role="main"]').count();
      expect(mainCount, "Doit avoir un landmark <main>").toBeGreaterThanOrEqual(1);

      // 2c. TabsList avec aria-label
      const tabsList = page.locator('[role="tablist"][aria-label]');
      const tabsCount = await tabsList.count();
      expect(tabsCount, "TabsList doit porter un aria-label").toBeGreaterThanOrEqual(1);
      const tabsLabel = await tabsList.first().getAttribute("aria-label");
      expect(tabsLabel).toBe("Sections de l'annonce");

      // 2d. Onglets : tous portent aria-selected (true ou false)
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount, "Doit avoir au moins 1 onglet").toBeGreaterThan(0);
      for (let i = 0; i < tabCount; i++) {
        const ariaSelected = await tabs.nth(i).getAttribute("aria-selected");
        expect(["true", "false"]).toContain(ariaSelected);
      }

      // 2e. Sitter : barre d'action <aside aria-label="...">
      if (scn.activeRole === "sitter") {
        const asides = await page
          .locator('aside[aria-label="Action de candidature"]')
          .count();
        expect(
          asides,
          "La vue sitter doit exposer un <aside aria-label='Action de candidature'>"
        ).toBeGreaterThanOrEqual(1);
      }

      // 2f. Toutes les images doivent avoir un alt (vide accepté pour décoratif)
      const imagesWithoutAlt = await page.evaluate(() => {
        const offending: string[] = [];
        document.querySelectorAll("img").forEach((img) => {
          if (!img.hasAttribute("alt")) {
            offending.push(img.src.slice(0, 80));
          }
        });
        return offending;
      });
      expect(
        imagesWithoutAlt,
        `Images sans attribut alt: ${imagesWithoutAlt.join(", ")}`
      ).toEqual([]);
    });
  }
});
