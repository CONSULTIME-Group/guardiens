/**
 * Garde-fou de la messagerie mobile.
 *
 * Régression d'août 2026 : sur `/messages`, avec une conversation ouverte sur
 * mobile, la barre de navigation basse et son bouton flottant se superposaient
 * au champ de saisie et au bouton d'envoi. La messagerie devenait inutilisable
 * sur téléphone.
 *
 * Le test échoue si, conversation ouverte sous le point de rupture md :
 *   1. `document.elementFromPoint` au centre du textarea ne renvoie pas le
 *      textarea lui même ;
 *   2. la barre de navigation basse reste montée dans le document.
 *
 * Sans identifiants E2E, le test est ignoré (jamais d'échec en CI publique).
 */
import { test, expect, hasAuthCreds } from "./auth-fixture";

const MOBILE_WIDTHS = [360, 390];

test.describe("Messagerie mobile, zone de saisie accessible", () => {
  test.skip(!hasAuthCreds, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD manquants");

  for (const width of MOBILE_WIDTHS) {
    test(`champ de saisie non recouvert à ${width}px`, async ({ authedPage: page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto("/messages", { waitUntil: "domcontentloaded" });

      // Ouvre la première conversation de la liste, si le compte en possède une.
      const firstConv = page.locator("[data-conversation-item], button, [role='button']").filter({ hasText: /./ });
      const composer = page.getByLabel("Écrire un message");

      if (!(await composer.isVisible().catch(() => false))) {
        const count = await firstConv.count();
        for (let i = 0; i < Math.min(count, 12); i++) {
          await firstConv.nth(i).click({ trial: false }).catch(() => {});
          if (await composer.isVisible().catch(() => false)) break;
        }
      }

      test.skip(!(await composer.isVisible().catch(() => false)), "Aucune conversation disponible sur le compte de test");

      await expect(composer).toBeVisible();

      const hit = await composer.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { isSelf: top === el || el.contains(top), tag: top?.tagName ?? null };
      });
      expect(hit.isSelf, `élément au centre du champ de saisie : ${hit.tag}`).toBe(true);

      // La barre basse doit être démontée, pas seulement translatée.
      const bottomNavCount = await page.locator("nav.md\\:hidden.fixed.bottom-0").count();
      expect(bottomNavCount).toBe(0);
    });
  }
});
