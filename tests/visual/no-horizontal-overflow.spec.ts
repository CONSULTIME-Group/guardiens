/**
 * Régression responsive — aucune route critique ne doit produire d'overflow
 * horizontal sur viewport mobile.
 *
 * Méthode : pour chaque (route × viewport), on charge la page, on attend le
 * rendu, puis on compare `document.documentElement.scrollWidth` à
 * `window.innerWidth`. Tout écart > tolérance fait échouer le test avec un
 * message explicite identifiant la route et le delta.
 *
 * Tolérance : 2 px pour absorber les arrondis (scrollbar, sub-pixel).
 *
 * Couverture : routes PUBLIQUES uniquement (les routes auth nécessitent une
 * session Supabase non disponible en CI sans mock). La couverture auth est
 * indirecte : le shell `AppLayout` (avec `min-w-0 overflow-x-hidden`) est le
 * même pour toutes les pages connectées, donc une régression du shell est
 * détectée par n'importe quelle route publique qui le mount (aucune ici —
 * mais le pattern flex-1 min-w-0 est garanti par revue de code).
 *
 * Cause racine historique (mai 2026) : `<main className="flex-1">` enfant
 * d'un parent `flex` sans `min-w-0` refuse de se rétrécir sous la largeur de
 * son contenu, propageant l'overflow dès qu'un enfant est large (slider,
 * hero image, toggle). Voir App.tsx:194 (`SmallMissionsRoute`) et
 * AppLayout.tsx:33.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

/** Tolérance en pixels (arrondis + scrollbar virtuelle). */
const TOLERANCE_PX = 2;

/** Viewports mobiles à couvrir. iPhone SE (320), iPhone 13 mini (375), iPhone 14 Pro (390). */
const VIEWPORTS = [
  { name: "iPhone SE 320", width: 320, height: 568 },
  { name: "iPhone 13 mini 375", width: 375, height: 667 },
  { name: "iPhone 14 390", width: 390, height: 844 },
];

/** Routes publiques à auditer. Authentification non requise. */
const ROUTES = [
  "/",
  "/petites-missions",
  "/tarifs",
  "/faq",
  "/a-propos",
  "/contact",
  "/connexion",
  "/inscription",
  "/mentions-legales",
  "/confidentialite",
];

async function measureOverflow(page: Page): Promise<{ scrollWidth: number; innerWidth: number; overflowingSelectors: string[] }> {
  return page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;

    // Identifier les éléments qui dépassent (debug)
    const overflowing: string[] = [];
    if (scrollWidth > innerWidth) {
      const all = Array.from(document.querySelectorAll<HTMLElement>("body *"));
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > innerWidth + 2 && rect.width > 0 && rect.width < scrollWidth + 100) {
          // Ignorer les éléments explicitement opt-in au scroll horizontal
          if (el.closest("[data-allow-x-scroll]")) continue;
          // Ignorer si parent est overflow-x: auto/scroll (carrousel intentionnel)
          const parent = el.parentElement;
          if (parent) {
            const ps = getComputedStyle(parent);
            if (ps.overflowX === "auto" || ps.overflowX === "scroll") continue;
          }
          const tag = el.tagName.toLowerCase();
          const cls = (el.className && typeof el.className === "string")
            ? `.${el.className.split(/\s+/).slice(0, 2).join(".")}`
            : "";
          overflowing.push(`${tag}${cls} (right=${Math.round(rect.right)}px)`);
          if (overflowing.length >= 5) break;
        }
      }
    }
    return { scrollWidth, innerWidth, overflowingSelectors: overflowing };
  });
}

test.describe("No horizontal overflow on critical public routes (mobile)", () => {
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${route} — ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        // Laisser le temps aux fonts/lazy components de se layouter
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(500);

        const { scrollWidth, innerWidth, overflowingSelectors } = await measureOverflow(page);
        const overflow = scrollWidth - innerWidth;

        if (overflow > TOLERANCE_PX) {
          const culprits = overflowingSelectors.length > 0
            ? `\nÉléments dépassants (top 5) :\n  - ${overflowingSelectors.join("\n  - ")}`
            : "\n(aucun élément non opt-in identifié — possible body/main wrapper)";
          throw new Error(
            `Overflow horizontal sur ${route} @ ${viewport.name} : ` +
            `scrollWidth=${scrollWidth}px > innerWidth=${innerWidth}px (delta=${overflow}px, tolerance=${TOLERANCE_PX}px).` +
            culprits
          );
        }

        expect(overflow).toBeLessThanOrEqual(TOLERANCE_PX);
      });
    }
  }
});
