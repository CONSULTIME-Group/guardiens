/**
 * Tests visuels — page /tarifs.
 *
 * Vérifie l'affichage du hero CTA et des badges des cartes pricing
 * sur plusieurs breakpoints, avec un focus particulier sur le mobile 390px
 * (référence iPhone 12/13/14/15) où les badges « Toujours gratuit » et
 * « Offert encore X jours » sont les plus contraints.
 *
 * Capture par élément (et non page entière) pour rester insensible aux
 * variations de contenu en dessous du fold (FAQ, sections marketing).
 *
 * Lancer :
 *   npx playwright test tests/visual/pricing-mobile-badges-hero.spec.ts
 *   npx playwright test tests/visual/pricing-mobile-badges-hero.spec.ts --update-snapshots
 */

import { test, expect } from "../../playwright-fixture";
import path from "node:path";
import fs from "node:fs/promises";

const PRICING_PATH = "/tarifs";

type ViewportKey = "mobile-320" | "mobile-390" | "mobile-414" | "tablet-768" | "desktop-1280";

const VIEWPORTS: Array<{ key: ViewportKey; width: number; height: number }> = [
  // Plus petit mobile encore courant (SE 1ère gen) — pire cas pour les badges
  { key: "mobile-320", width: 320, height: 568 },
  // Cible principale demandée (iPhone 12/13/14/15)
  { key: "mobile-390", width: 390, height: 844 },
  // Mobile large (iPhone Plus / Pro Max)
  { key: "mobile-414", width: 414, height: 896 },
  { key: "tablet-768", width: 768, height: 1024 },
  { key: "desktop-1280", width: 1280, height: 900 },
];

const OUT_DIR = path.join(process.cwd(), "test-results", "pricing");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

test.describe("Pricing — hero CTA + badges sur breakpoints", () => {
  test.setTimeout(120_000);

  for (const vp of VIEWPORTS) {
    test(`${vp.key} (${vp.width}×${vp.height})`, async ({ page }) => {
      const vpDir = path.join(OUT_DIR, vp.key);
      await ensureDir(vpDir);

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(PRICING_PATH, { waitUntil: "networkidle" });

      // Stabilisation : police, layout, animations
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(400);

      // ----- 1) Hero (titre + sous-titre + CTAs) -----
      const hero = page.locator('[data-testid="pricing-hero"]').first();
      await hero.waitFor({ state: "visible", timeout: 10_000 });
      await hero.scrollIntoViewIfNeeded();

      const heroPath = path.join(vpDir, `hero-${vp.key}.png`);
      await hero.screenshot({ path: heroPath, animations: "disabled" });
      expect(await fs.readFile(heroPath)).toMatchSnapshot(
        `hero-${vp.key}.png`,
        { maxDiffPixelRatio: 0.02 }
      );

      // ----- 2) CTA hero isolé (vérifie wrapping vertical mobile) -----
      const cta = page.locator('[data-testid="pricing-hero-cta"]').first();
      await cta.waitFor({ state: "visible" });
      const ctaBox = await cta.boundingBox();
      expect(ctaBox, "CTA hero doit être visible et mesurable").not.toBeNull();
      // Aucun débordement horizontal
      expect(ctaBox!.width).toBeLessThanOrEqual(vp.width);

      const ctaPath = path.join(vpDir, `hero-cta-${vp.key}.png`);
      await cta.screenshot({ path: ctaPath, animations: "disabled" });
      expect(await fs.readFile(ctaPath)).toMatchSnapshot(
        `hero-cta-${vp.key}.png`,
        { maxDiffPixelRatio: 0.02 }
      );

      // ----- 3) Cartes pricing avec badges -----
      const cards = page.locator('[data-testid="pricing-cards"]').first();
      await cards.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);

      const cardsPath = path.join(vpDir, `cards-${vp.key}.png`);
      await cards.screenshot({ path: cardsPath, animations: "disabled" });
      expect(await fs.readFile(cardsPath)).toMatchSnapshot(
        `cards-${vp.key}.png`,
        { maxDiffPixelRatio: 0.02 }
      );

      // ----- 4) Badges isolés + invariants anti-débordement -----
      for (const id of ["badge-owner", "badge-sitter"] as const) {
        const badge = page.locator(`[data-testid="${id}"]`).first();
        await badge.waitFor({ state: "visible" });
        await badge.scrollIntoViewIfNeeded();

        const card = page
          .locator(`[data-testid="${id === "badge-owner" ? "owner-card" : "sitter-card"}"]`)
          .first();
        const badgeBox = await badge.boundingBox();
        const cardBox = await card.boundingBox();
        expect(badgeBox).not.toBeNull();
        expect(cardBox).not.toBeNull();

        // Le badge doit rester à l'intérieur de la largeur de sa carte
        // (12px de marge garantis par max-w-[calc(100%-1.5rem)]).
        expect(badgeBox!.width).toBeLessThanOrEqual(cardBox!.width);
        // Sur une seule ligne : hauteur < ~36px (text-xs + py-1.5 + shadow)
        expect(badgeBox!.height).toBeLessThan(40);

        const badgePath = path.join(vpDir, `${id}-${vp.key}.png`);
        await badge.screenshot({ path: badgePath, animations: "disabled" });
        expect(await fs.readFile(badgePath)).toMatchSnapshot(
          `${id}-${vp.key}.png`,
          { maxDiffPixelRatio: 0.02 }
        );
      }

      // Tous les fichiers attendus présents
      const files = await fs.readdir(vpDir);
      const pngs = files.filter((f) => f.endsWith(".png"));
      // hero + hero-cta + cards + 2 badges = 5
      expect(pngs.length).toBeGreaterThanOrEqual(5);
    });
  }
});
