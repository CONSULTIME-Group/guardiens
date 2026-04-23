/**
 * Test E2E — NetworkErrorMonitor
 *
 * Simule un endpoint Supabase REST renvoyant 500 sur une route critique
 * (/dashboard) et vérifie :
 *   1. qu'un toast d'erreur ("Problème de connexion au service") s'affiche.
 *   2. qu'aucune erreur JavaScript console (uncaught) n'est levée.
 *      (Les `console.error` liés au 500 réseau lui-même sont attendus
 *      et filtrés — on ne valide que l'absence d'exceptions JS.)
 *
 * Lancer :
 *   npx playwright test tests/network-error-monitor.spec.ts
 */

import { test, expect } from "../playwright-fixture";
import type { ConsoleMessage, Page } from "@playwright/test";

const CRITICAL_ROUTE = "/dashboard";

// Patterns d'erreurs console attendues (réseau/Supabase non-2xx, fetch failed…)
// On les exclut de l'assertion stricte car le 500 simulé en génère légitimement.
const EXPECTED_NOISE = [
  /Failed to load resource/i,
  /the server responded with a status of 5\d{2}/i,
  /500 \(Internal Server Error\)/i,
  /NetworkErrorMonitor/i,
  /supabase/i,
  /fetch/i,
];

const isExpectedNoise = (text: string) =>
  EXPECTED_NOISE.some((re) => re.test(text));

async function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!isExpectedNoise(text)) errors.push(text);
    }
  });

  // Exceptions JS non capturées — toujours considérées comme une régression
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  return { errors, pageErrors };
}

test.describe("NetworkErrorMonitor — toast + console propres sur 500", () => {
  test.setTimeout(60_000);

  test("affiche le toast et ne lève aucune exception JS", async ({ page }) => {
    const { errors, pageErrors } = await collectConsoleErrors(page);

    // 1) Intercepte le premier appel Supabase REST/RPC sur la route critique
    //    et renvoie un 500. Une seule requête pour éviter de bloquer toute
    //    l'app — suffit à déclencher le NetworkErrorMonitor.
    let injected = false;
    await page.route(/\/rest\/v1\/.+/, async (route) => {
      if (injected) return route.continue();
      const req = route.request();
      // Cible les GET (lecture) — laisse passer auth/refresh tokens
      if (req.method() !== "GET") return route.continue();
      injected = true;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Simulated server error" }),
      });
    });

    // 2) Navigue sur la route critique
    await page.goto(CRITICAL_ROUTE, { waitUntil: "domcontentloaded" });

    // 3) Attend le toast déclenché par NetworkErrorMonitor
    //    (texte exact défini dans src/components/layout/NetworkErrorMonitor.tsx)
    const toast = page
      .getByText(/Problème de connexion au service/i)
      .first();

    await expect(toast).toBeVisible({ timeout: 15_000 });

    // Vérifie aussi la description (statut 500)
    await expect(
      page.getByText(/statut\s*500/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // 4) Laisse retomber la file d'événements pour capter d'éventuelles
    //    exceptions tardives (effets, listeners…)
    await page.waitForTimeout(500);

    // 5) Aucune exception JS non capturée
    expect(
      pageErrors,
      `pageerror inattendu(s):\n${pageErrors.join("\n")}`
    ).toHaveLength(0);

    // 6) Aucune erreur console hors bruit réseau attendu
    expect(
      errors,
      `console.error inattendu(s):\n${errors.join("\n")}`
    ).toHaveLength(0);
  });
});
