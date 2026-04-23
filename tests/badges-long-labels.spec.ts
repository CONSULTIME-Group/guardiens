/**
 * Test E2E Playwright — capture des sceaux de badges aux 3 vrais viewports
 * (375 / 768 / 1920) avec un vrai navigateur, ce qui contourne les limites
 * d'html2canvas (media queries, fonts custom, transforms, animations Radix).
 *
 * Pour chaque viewport :
 *   1. Capture la grille complète des badges
 *   2. Pour chaque badge de TEST_CASES, clique dessus, attend la modale
 *      (data-staged-badge="<id>") et capture cette modale isolément.
 *
 * Les images sont stockées dans `test-results/badges/<viewport>/...`
 * Si une baseline existe (`badges-baseline/<viewport>/...`), une comparaison
 * pixel par pixel est effectuée via `expect(...).toMatchSnapshot(...)`.
 *
 * Lancer :
 *   npx playwright test tests/badges-long-labels.spec.ts
 *   npx playwright test tests/badges-long-labels.spec.ts --update-snapshots
 */

import { test, expect } from "../playwright-fixture";
import type { Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";

const TEST_PATH = "/test/badges-long-labels";

// IDs des badges injectés par TestBadgesLongLabels — doivent rester
// synchronisés avec TEST_CASES dans src/pages/TestBadgesLongLabels.tsx
const BADGE_IDS = [
  "animaux_heureux",
  "maison_nickel",
  "voisins_adorent",
  "fondateur",
  "coup_de_main_or",
  "id_verifiee",
] as const;

type ViewportKey = "mobile" | "tablet" | "desktop";

const VIEWPORTS: Array<{ key: ViewportKey; width: number; height: number }> = [
  { key: "mobile", width: 375, height: 812 },
  { key: "tablet", width: 768, height: 1024 },
  { key: "desktop", width: 1920, height: 1080 },
];

// Dossier où sont stockées les captures fraîches (debug + diffs)
const OUT_DIR = path.join(process.cwd(), "test-results", "badges");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Attend que la modale ouverte corresponde au badge attendu et que ses
 * animations Radix soient terminées (data-state="open").
 */
async function waitForBadgeDialog(page: Page, badgeId: string) {
  const dialog = page.locator(
    `[role="dialog"][data-state="open"], [data-staged-badge="${badgeId}"][data-state="open"]`
  ).first();
  await dialog.waitFor({ state: "visible", timeout: 5_000 });
  // Laisse l'animation d'entrée finir (Radix utilise ~150ms)
  await page.waitForTimeout(250);
  return dialog;
}

test.describe("Badges — captures par vrai viewport", () => {
  // Capture peut être lente (3 viewports × 7 captures) — on relâche le timeout
  test.setTimeout(120_000);

  for (const vp of VIEWPORTS) {
    test(`viewport ${vp.key} (${vp.width}×${vp.height})`, async ({ page }) => {
      const vpDir = path.join(OUT_DIR, vp.key);
      await ensureDir(vpDir);

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(TEST_PATH, { waitUntil: "networkidle" });

      // Attend qu'au moins un badge soit monté
      await page
        .locator(`button[aria-label]`, { hasText: "" })
        .first()
        .waitFor({ state: "visible", timeout: 10_000 });

      // Stabilisation : police, layout, animations d'entrée
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(400);

      // ----- 1) Capture de la grille -----
      const grid = page
        .locator('[data-stage-vp], section:has-text("Grille de sceaux")')
        .first();
      await grid.waitFor({ state: "visible" });
      const gridPath = path.join(vpDir, `grille-${vp.key}-${vp.width}px.png`);
      await grid.screenshot({ path: gridPath, animations: "disabled" });

      // Comparaison snapshot (créée si absente, comparée sinon)
      expect(await fs.readFile(gridPath)).toMatchSnapshot(
        `grille-${vp.key}-${vp.width}px.png`,
        { maxDiffPixelRatio: 0.02 }
      );

      // ----- 2) Capture de chaque modale -----
      for (const badgeId of BADGE_IDS) {
        // Cible le bouton de badge dans la grille de capture
        // (présent partout, mais on prend la 1ère occurrence — la grille principale)
        const badgeButton = page
          .locator(`[data-stage-vp] button[aria-label]`)
          .nth(BADGE_IDS.indexOf(badgeId));

        // Si la grille n'utilise pas data-stage-vp (mode auto), fallback :
        const trigger = (await badgeButton.count())
          ? badgeButton
          : page.locator(`button[aria-label]`).nth(BADGE_IDS.indexOf(badgeId));

        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();

        const dialog = await waitForBadgeDialog(page, badgeId);
        const modalPath = path.join(
          vpDir,
          `modale-${badgeId}-${vp.key}-${vp.width}px.png`
        );
        await dialog.screenshot({ path: modalPath, animations: "disabled" });

        expect(await fs.readFile(modalPath)).toMatchSnapshot(
          `modale-${badgeId}-${vp.key}-${vp.width}px.png`,
          { maxDiffPixelRatio: 0.02 }
        );

        // Ferme la modale (Escape) avant la suivante
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }

      // Vérifie que toutes les images attendues ont bien été créées
      const expected = 1 + BADGE_IDS.length;
      const files = await fs.readdir(vpDir);
      const pngs = files.filter((f) => f.endsWith(".png"));
      expect(pngs.length).toBeGreaterThanOrEqual(expected);
    });
  }
});
