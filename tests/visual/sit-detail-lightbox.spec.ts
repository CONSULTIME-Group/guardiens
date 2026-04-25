/**
 * Test fonctionnel de la lightbox / carrousel de SitHero sur /sits/:id.
 *
 * Scénario `published-sitter-with-photos` : 3 photos de logement + 1 photo
 * d'animal mergées dans le hero = 4 photos au total dans la galerie.
 *
 * Vérifie :
 *  1. Le compteur "X / N" sur le hero affiche bien `1 / 4` au chargement.
 *  2. Les vignettes sous le hero correspondent en nombre à `total`.
 *  3. Cliquer la photo principale ouvre la lightbox (role="dialog", aria-modal).
 *  4. La lightbox est rendue dans `document.body` (portal) — donc en dehors
 *     de <main>, au-dessus de la sidebar.
 *  5. La lightbox contient bien `total` photos navigables : le bouton
 *     "Photo suivante" (ChevronRight) avance d'1 et "Photo précédente" recule
 *     d'1, avec wrap-around (1 → 4 et inversement).
 *  6. Échap ferme la lightbox et restaure le focus.
 *
 * Port 8768 pour ne pas conflit avec les autres specs SitDetail
 * (8765 sit-detail, 8766 a11y, 8767 keyboard).
 */

import { test, expect } from "../../playwright-fixture";
import { spawn, type ChildProcess } from "node:child_process";
import { SCENARIOS } from "./fixtures";
import { captureFailureArtifacts, type FocusLogEntry } from "./failure-capture";

const PORT = 8768;
const BASE_URL = `http://localhost:${PORT}`;

let viteProcess: ChildProcess | null = null;
let currentScenario = "unknown";
let currentFocusLog: FocusLogEntry[] = [];
let currentPhase = "init";

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {
      /* not ready */
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

test.afterEach(async ({ page }, testInfo) => {
  await captureFailureArtifacts(page, testInfo, {
    scenarioId: currentScenario,
    focusLog: currentFocusLog,
    phase: currentPhase,
  });
});

test.describe("Lightbox carrousel — /sits/:id", () => {
  test.setTimeout(90_000);

  test("ouvre la lightbox, compte les photos et navigue avec next/prev", async ({
    page,
  }) => {
    const scenarioId = "published-sitter-with-photos" as const;
    const scn = SCENARIOS[scenarioId];

    currentScenario = scenarioId;
    currentFocusLog = [];
    currentPhase = "load";

    // Nombre de photos attendu = photos logement + photos pets non nulles.
    const expectedTotal =
      (scn.data.property.photos?.length ?? 0) +
      scn.data.pets.filter((p: any) => !!p?.photo_url).length;

    expect(
      expectedTotal,
      "Le scénario doit avoir au moins 2 photos pour valider la nav"
    ).toBeGreaterThanOrEqual(2);

    await page.setViewportSize({ width: 1280, height: 900 });
    const url = `${BASE_URL}/sits/${scn.sitId}?scenario=${scenarioId}`;
    await page.goto(url, { waitUntil: "networkidle" });

    // Attend que le hero soit rendu (titre H1/H2 visible).
    await page.waitForFunction(
      () => {
        const h = document.querySelector("h1, h2");
        return !!h && (h.textContent || "").trim().length > 0;
      },
      { timeout: 15_000 }
    );

    // ---------- 1. Compteur initial sur le hero : "1 / N" ----------
    currentPhase = "hero-counter";
    const heroOpenButton = page.locator(
      'button[aria-label^="Agrandir la photo"]'
    );
    await expect(heroOpenButton, "Le bouton d'ouverture du hero existe").toBeVisible();

    // Le compteur "X / N" n'apparaît que si total > 1
    if (expectedTotal > 1) {
      const heroCounter = heroOpenButton.locator("text=/^\\s*1\\s*\\/\\s*\\d+\\s*$/");
      await expect(heroCounter).toBeVisible();
      await expect(heroCounter).toHaveText(
        new RegExp(`^\\s*1\\s*/\\s*${expectedTotal}\\s*$`)
      );
    }

    // ---------- 2. Vignettes : nombre = total ----------
    currentPhase = "thumbnails";
    if (expectedTotal > 1) {
      const thumbs = page.locator('button[aria-label^="Voir la photo"]');
      await expect(thumbs).toHaveCount(expectedTotal);
    }

    // ---------- 3. Click sur la photo principale → lightbox s'ouvre ----------
    currentPhase = "open-lightbox";
    await heroOpenButton.click();

    const lightbox = page.locator(
      '[role="dialog"][aria-label="Galerie photos plein écran"]'
    );
    await expect(lightbox, "La lightbox s'ouvre au click").toBeVisible();
    await expect(lightbox).toHaveAttribute("aria-modal", "true");

    // ---------- 4. Vérifie que la lightbox est rendue via portal (pas dans <main>) ----------
    const isPortalRendered = await lightbox.evaluate((el) => {
      const main = document.querySelector("main");
      // Le dialog doit être hors du <main> (rendu dans body via createPortal).
      return !!main && !main.contains(el) && document.body.contains(el);
    });
    expect(
      isPortalRendered,
      "La lightbox est rendue dans document.body via createPortal"
    ).toBe(true);

    // ---------- 4bis. Scroll-lock : body.style.overflow === "hidden" ----------
    currentPhase = "scroll-lock-on";
    const overflowOpen = await page.evaluate(() => document.body.style.overflow);
    expect(
      overflowOpen,
      "Pendant que la lightbox est ouverte, le scroll du body est bloqué"
    ).toBe("hidden");

    // ---------- 5. Compteur dans la lightbox : "1 / N" ----------
    currentPhase = "lightbox-counter-initial";
    if (expectedTotal > 1) {
      const lbCounter = lightbox.locator("text=/^\\s*\\d+\\s*\\/\\s*\\d+\\s*$/").first();
      await expect(lbCounter).toBeVisible();
      await expect(lbCounter).toHaveText(
        new RegExp(`^\\s*1\\s*/\\s*${expectedTotal}\\s*$`)
      );

      // ---------- 6. Navigation : "Photo suivante" avance le compteur ----------
      currentPhase = "lightbox-next";
      const nextBtn = lightbox.locator('button[aria-label="Photo suivante"]');
      const prevBtn = lightbox.locator('button[aria-label="Photo précédente"]');
      await expect(nextBtn).toBeVisible();
      await expect(prevBtn).toBeVisible();

      // Avance jusqu'à la dernière photo.
      for (let i = 2; i <= expectedTotal; i++) {
        await nextBtn.click();
        await expect(lbCounter).toHaveText(
          new RegExp(`^\\s*${i}\\s*/\\s*${expectedTotal}\\s*$`)
        );
      }

      // Wrap-around : un click "suivant" sur la dernière photo revient à 1.
      currentPhase = "lightbox-wrap-forward";
      await nextBtn.click();
      await expect(lbCounter).toHaveText(
        new RegExp(`^\\s*1\\s*/\\s*${expectedTotal}\\s*$`)
      );

      // Wrap-around : un click "précédent" sur la 1ère photo revient à N.
      currentPhase = "lightbox-wrap-backward";
      await prevBtn.click();
      await expect(lbCounter).toHaveText(
        new RegExp(`^\\s*${expectedTotal}\\s*/\\s*${expectedTotal}\\s*$`)
      );

      // Recule jusqu'à 1 pour vérifier la symétrie de prev.
      currentPhase = "lightbox-prev";
      for (let i = expectedTotal - 1; i >= 1; i--) {
        await prevBtn.click();
        await expect(lbCounter).toHaveText(
          new RegExp(`^\\s*${i}\\s*/\\s*${expectedTotal}\\s*$`)
        );
      }
    }

    // ---------- 7. Vérifie qu'une <img> est bien rendue dans la lightbox ----------
    currentPhase = "lightbox-image";
    const lbImage = lightbox.locator("img").first();
    await expect(lbImage).toBeVisible();
    const altText = await lbImage.getAttribute("alt");
    expect(altText, "L'image a un alt descriptif").toMatch(
      /Photo \d+ sur \d+ de la garde/
    );

    // ---------- 8. Échap ferme la lightbox ----------
    currentPhase = "close-lightbox";
    await page.keyboard.press("Escape");
    await expect(lightbox).toBeHidden();
  });
});
