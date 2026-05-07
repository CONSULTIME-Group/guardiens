/**
 * Test E2E Playwright — flux "Partager le lien" du bandeau de publication
 * d'une petite mission.
 *
 * Vérifie deux scénarios :
 *   1. navigator.share disponible → utilisé avec une URL nettoyée (pas de ?published=1)
 *   2. navigator.share absent → fallback navigator.clipboard.writeText avec
 *      la même URL nettoyée + toast "Lien copié."
 *
 * Dans tous les cas, l'URL partagée NE DOIT JAMAIS contenir ?published=1.
 *
 * Lancer :
 *   npx playwright test tests/mission-published-banner-share.spec.ts
 */
import { test, expect } from "../playwright-fixture";

const TEST_PATH = "/test/mission-published-banner";
// Doit rester synchronisé avec FORCED_URL dans TestMissionPublishedBanner.tsx
const FORCED_BASE = "https://example.test/petites-missions/mission-test-1234";
const EXPECTED_CLEAN_URL = FORCED_BASE; // sans ?published=1

test.describe("MissionPublishedBanner — partage", () => {
  test("navigator.share : appelé avec une URL nettoyée (sans ?published=1)", async ({ page }) => {
    // Mock navigator.share AVANT toute exécution du JS de la page.
    await page.addInitScript(() => {
      (window as any).__shareCalls = [];
      Object.defineProperty(navigator, "share", {
        configurable: true,
        writable: true,
        value: (data: any) => {
          (window as any).__shareCalls.push(data);
          return Promise.resolve();
        },
      });
    });

    await page.goto(TEST_PATH);
    await expect(page.getByTestId("mission-published-banner")).toBeVisible();

    await page.getByRole("button", { name: "Partager le lien" }).click();

    const calls = await page.evaluate(() => (window as any).__shareCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0].title).toBe("Promener mon chien");
    expect(calls[0].url).toBe(EXPECTED_CLEAN_URL);
    expect(calls[0].url).not.toContain("?published=1");
    expect(calls[0].url).not.toContain("published=");

    // Pas de toast en mode share natif réussi.
    const toastCount = await page.getByTestId("probe-toasts").getAttribute("data-toast-count");
    expect(toastCount).toBe("0");
  });

  test("fallback clipboard : URL nettoyée + toast succès quand navigator.share absent", async ({ page }) => {
    await page.addInitScript(() => {
      // Garantit que navigator.share n'existe pas, même si le navigateur en
      // expose une implémentation par défaut.
      try {
        // @ts-expect-error suppression dynamique
        delete (navigator as any).share;
      } catch {
        Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      }

      (window as any).__clipCalls = [];
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        writable: true,
        value: {
          writeText: (text: string) => {
            (window as any).__clipCalls.push(text);
            return Promise.resolve();
          },
        },
      });
    });

    await page.goto(TEST_PATH);
    await expect(page.getByTestId("mission-published-banner")).toBeVisible();

    await page.getByRole("button", { name: "Partager le lien" }).click();

    const clipCalls = await page.evaluate(() => (window as any).__clipCalls);
    expect(clipCalls).toHaveLength(1);
    expect(clipCalls[0]).toBe(EXPECTED_CLEAN_URL);
    expect(clipCalls[0]).not.toContain("?published=1");
    expect(clipCalls[0]).not.toContain("published=");

    // Toast succès rendu via la sonde.
    await expect(page.getByTestId("probe-toast-title")).toHaveText("Lien copié.");
    const variant = await page.getByTestId("probe-toast").getAttribute("data-variant");
    expect(variant).toBe("default");
  });

  test("fallback clipboard : toast d'erreur si clipboard rejette", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        // @ts-expect-error suppression dynamique
        delete (navigator as any).share;
      } catch {
        Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      }
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        writable: true,
        value: {
          writeText: () => Promise.reject(new Error("denied")),
        },
      });
    });

    await page.goto(TEST_PATH);
    await page.getByRole("button", { name: "Partager le lien" }).click();

    await expect(page.getByTestId("probe-toast-title")).toHaveText("Copie impossible.");
    const variant = await page.getByTestId("probe-toast").getAttribute("data-variant");
    expect(variant).toBe("destructive");
  });
});
