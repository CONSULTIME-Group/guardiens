/**
 * Garde-fou de navigation mobile.
 *
 * Régression d'août 2026 : le cluster mobile de l'en tête empilait quatre
 * éléments à droite du logo (langue, connexion, création de compte, burger).
 * Le conteneur dépassait le bord droit du viewport, le bouton "Menu" sortait
 * entièrement de l'écran et `body { overflow-x: clip }` interdisait tout
 * défilement pour le rattraper. Résultat : aucune navigation possible sur
 * iPhone SE, iPhone 12 à 15, Galaxy S et Pixel.
 *
 * Ce test échoue si, sous le point de rupture sm :
 *   1. un descendant de l'en tête dépasse la largeur du viewport ;
 *   2. le bouton burger n'est pas entièrement dans le viewport ;
 *   3. `document.elementFromPoint` sur le centre du burger ne renvoie pas le
 *      bouton lui même (élément recouvert ou hors écran).
 *
 * Il vérifie aussi qu'à partir de sm, la navigation complète reste rendue et
 * que le burger disparaît, pour interdire toute régression du desktop.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

/** Tolérance en pixels (arrondis sub-pixel). */
const TOLERANCE_PX = 1;

/** Largeurs mobiles réelles du parc, 320 étant le plancher supporté. */
const MOBILE_WIDTHS = [320, 360, 375, 387, 390, 412];

/** Libellés attendus de la navigation principale, panneau burger ouvert. */
const NAV_LABELS = [
  "Annonces en cours",
  "Entraide",
  "Guides locaux",
  "Tarifs",
  "Le journal",
];

async function headerOverflow(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return { found: false, innerWidth: window.innerWidth, offenders: [] as string[] };
    const innerWidth = window.innerWidth;
    const offenders: string[] = [];
    const nodes = [header, ...Array.from(header.querySelectorAll<HTMLElement>("*"))];
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      // Les conteneurs explicitement défilables portent leur propre débordement.
      const cs = getComputedStyle(el);
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") continue;
      if (rect.right > innerWidth + 1 || rect.left < -1) {
        const tag = el.tagName.toLowerCase();
        const cls =
          typeof el.className === "string" && el.className
            ? `.${el.className.split(/\s+/).slice(0, 3).join(".")}`
            : "";
        offenders.push(
          `${tag}${cls} (left=${Math.round(rect.left)}px, right=${Math.round(rect.right)}px)`,
        );
        if (offenders.length >= 5) break;
      }
    }
    return { found: true, innerWidth, offenders };
  });
}

test.describe("En tête mobile, le burger reste atteignable", () => {
  for (const width of MOBILE_WIDTHS) {
    test(`burger dans le viewport et cliquable à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(400);

      // 1. Aucun descendant de l'en tête ne sort du viewport.
      const { found, innerWidth, offenders } = await headerOverflow(page);
      expect(found, "aucun élément header rendu").toBe(true);
      if (offenders.length > 0) {
        throw new Error(
          `Débordement de l'en tête à ${width} px (innerWidth=${innerWidth}px) :\n  - ` +
            offenders.join("\n  - "),
        );
      }

      // 2. Le burger est rendu, entièrement dans le viewport.
      const burger = page.getByRole("button", { name: /menu/i }).first();
      await expect(burger).toBeVisible();
      const box = await burger.boundingBox();
      expect(box, "bouton Menu sans boîte englobante").not.toBeNull();
      if (!box) return;
      expect(
        box.x,
        `bord gauche du burger hors viewport à ${width} px`,
      ).toBeGreaterThanOrEqual(-TOLERANCE_PX);
      expect(
        box.x + box.width,
        `bord droit du burger hors viewport à ${width} px`,
      ).toBeLessThanOrEqual(width + TOLERANCE_PX);

      // 3. Le point central du burger renvoie bien le bouton, pas null.
      const hit = await page.evaluate(
        ([x, y]) => {
          const el = document.elementFromPoint(x, y);
          if (!el) return null;
          const btn = el.closest("button");
          return btn ? btn.getAttribute("aria-label") : el.tagName;
        },
        [box.x + box.width / 2, box.y + box.height / 2],
      );
      expect(
        hit,
        `elementFromPoint sur le centre du burger à ${width} px doit renvoyer le bouton`,
      ).toMatch(/menu/i);

      // 4. Le panneau ouvre bien la navigation principale, plus les actions de
      //    compte remontées depuis l'en tête.
      await burger.click();
      await page.waitForTimeout(300);
      for (const label of NAV_LABELS) {
        await expect(
          page.getByRole("link", { name: new RegExp(`^${label}`) }).first(),
        ).toBeVisible();
      }
      await expect(page.getByRole("button", { name: /créer mon compte/i }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /connexion/i }).first()).toBeVisible();
    });
  }

  test("desktop inchangé à 1280 px, navigation complète et pas de burger", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(400);

    const { offenders } = await headerOverflow(page);
    expect(offenders, `débordement de l'en tête en desktop : ${offenders.join(", ")}`).toHaveLength(0);

    await expect(page.getByRole("button", { name: /^menu$/i })).toHaveCount(0);
    for (const label of NAV_LABELS) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^${label}`) }).first(),
      ).toBeVisible();
    }
  });
});
