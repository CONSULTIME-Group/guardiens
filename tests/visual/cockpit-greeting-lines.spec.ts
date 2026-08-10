import { test, expect } from "@playwright/test";

/**
 * Garde fou : en 390 px, le titre de la carte d'accueil ne doit jamais
 * se rendre sur plus de deux lignes, pour les deux variantes de rôle.
 * On mesure le nombre de lignes réellement rendues (hauteur de
 * l'élément divisée par la hauteur de ligne), pas seulement l'absence
 * de troncature.
 */
test.describe("Carte d'accueil, titre en 390 px", () => {
  test.use({ viewport: { width: 390, height: 900 } });

  test("le titre tient sur deux lignes au maximum, gardien et propriétaire", async ({ page }) => {
    await page.goto("/dev/preview/cockpits", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cockpit-case"] h1');

    const measures = await page.evaluate(() => {
      const cases = Array.from(document.querySelectorAll('[data-testid="cockpit-case"]'));
      return cases.map((c) => {
        const h1 = c.querySelector("h1") as HTMLElement;
        const cs = getComputedStyle(h1);
        const fontSize = parseFloat(cs.fontSize);
        const lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.2;
        const height = h1.getBoundingClientRect().height;
        return {
          role: (c as HTMLElement).dataset.role as string,
          text: (h1.textContent || "").trim(),
          containerWidth: Math.round((h1.parentElement as HTMLElement).getBoundingClientRect().width),
          fontSize: Math.round(fontSize * 100) / 100,
          lines: Math.round(height / lineHeight),
        };
      });
    });

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(measures, null, 2));

    expect(measures.length).toBeGreaterThan(0);
    for (const m of measures) {
      expect(m.containerWidth, `${m.role} : ${m.text}`).toBeGreaterThanOrEqual(200);
      expect(m.lines, `${m.role} : ${m.text}`).toBeLessThanOrEqual(2);
    }
  });
});
