/**
 * Variante authentifiée du test "no horizontal overflow" — couvre les routes
 * connectées qui mountent `AppLayout` (ou son doublon `SmallMissionsRoute`).
 *
 * Skip automatique si E2E_TEST_EMAIL / E2E_TEST_PASSWORD ne sont pas fournis
 * (cf. tests/visual/auth-fixture.ts).
 *
 * Mêmes invariants que la spec publique : delta ≤ 2 px entre scrollWidth et
 * innerWidth, opt-out via [data-allow-x-scroll] ou parent overflow-x: auto.
 */
import { test, expect } from "./auth-fixture";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
const TOLERANCE_PX = 2;

const VIEWPORTS = [
  { name: "iPhone SE 320", width: 320, height: 568 },
  { name: "iPhone 13 mini 375", width: 375, height: 667 },
  { name: "iPhone 14 390", width: 390, height: 844 },
];

/** Routes auth critiques. /petites-missions inclus car shell distinct (App.tsx). */
const AUTH_ROUTES = [
  "/dashboard",
  "/profil",
  "/messages",
  "/notifications",
  "/petites-missions",
];

test.describe("No horizontal overflow on critical auth routes (mobile)", () => {
  for (const route of AUTH_ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${route} — ${viewport.name}`, async ({ authedPage }) => {
        await authedPage.setViewportSize({ width: viewport.width, height: viewport.height });
        await authedPage.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        await authedPage.waitForLoadState("networkidle").catch(() => {});
        await authedPage.waitForTimeout(800); // données async (queries Supabase)

        const result = await authedPage.evaluate(() => {
          const innerWidth = window.innerWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const overflowing: string[] = [];
          if (scrollWidth > innerWidth) {
            const all = Array.from(document.querySelectorAll<HTMLElement>("body *"));
            for (const el of all) {
              const rect = el.getBoundingClientRect();
              if (rect.right > innerWidth + 2 && rect.width > 0 && rect.width < scrollWidth + 100) {
                if (el.closest("[data-allow-x-scroll]")) continue;
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
          return { scrollWidth, innerWidth, overflowing };
        });

        const overflow = result.scrollWidth - result.innerWidth;
        if (overflow > TOLERANCE_PX) {
          const culprits = result.overflowing.length > 0
            ? `\nÉléments dépassants (top 5) :\n  - ${result.overflowing.join("\n  - ")}`
            : "\n(aucun élément non opt-in identifié)";
          throw new Error(
            `Overflow horizontal sur ${route} @ ${viewport.name} : ` +
            `scrollWidth=${result.scrollWidth}px > innerWidth=${result.innerWidth}px (delta=${overflow}px).` +
            culprits
          );
        }
        expect(overflow).toBeLessThanOrEqual(TOLERANCE_PX);
      });
    }
  }
});
