/**
 * Tunnel post-inscription propriétaire (lots 1 et 2, 16/08/2026).
 *
 * Prouve de bout en bout, backend intégralement simulé :
 *  A. un propriétaire fraîchement inscrit atteint l'écran de création
 *     d'annonce en traversant l'onboarding d'affinité, sans passer par le
 *     tableau de bord, et peut y renseigner son identité ;
 *  B. la sortie « Je préfère faire ça plus tard » fonctionne depuis le
 *     tunnel et la modale d'onboarding, masquée dans le tunnel, revient
 *     au tableau de bord ;
 *  C. l'écran de mise en route tient en 390 px sans débordement.
 */
import { test, expect } from "../playwright-fixture";
import { installTunnelMocks } from "./helpers/ownerTunnelMocks";

const CREATE_URL = "http://localhost:8080/sits/create?source=signup";

test.describe("Tunnel post-inscription propriétaire", () => {
  test("A. Affinité traversée puis retour au tunnel, identité collectée sur place", async ({ page }) => {
    await installTunnelMocks(page, { flagEnabled: true, affinityComplete: false });
    await page.goto(CREATE_URL);

    // Le garde-fou d'affinité s'intercale et transporte la destination.
    await page.waitForURL(/\/onboarding\/affinity\?redirect=/, { timeout: 15_000 });
    expect(page.url()).toContain(encodeURIComponent("/sits/create?source=signup"));
    await page.screenshot({ path: "test-results/tunnel-a-affinity.png" });

    // Formulaire propriétaire : présence, gardien idéal, rythme de vie.
    await page.locator("#presence-expected").click();
    await page.getByRole("option", { name: "100% sur place" }).click();
    await page.getByRole("button", { name: "Sans préférence" }).click();
    await page.getByRole("radio", { name: "Calme" }).click();
    await page.getByRole("button", { name: /Accéder à mon espace/i }).click();

    // Le tunnel se reforme après l'affinité, pas de retour au tableau de bord.
    await page.waitForURL(/\/sits\/create\?source=signup/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Trois éléments et votre annonce peut partir/i }),
    ).toBeVisible({ timeout: 15_000 });

    // La modale d'onboarding ne s'interpose pas dans le tunnel.
    await page.waitForTimeout(2500);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Collecte du prénom et du code postal sur place.
    await page.locator("#setup-identity-firstname").fill("Marie");
    await page.locator("#setup-identity-postal").fill("69001");
    const identitySection = page.locator("section").filter({ has: page.locator("#setup-identity-postal") });
    await identitySection.getByRole("button", { name: /Enregistrer/i }).click();
    await expect(
      page.getByText(/Votre prénom et votre code postal sont enregistrés/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /Deux éléments et votre annonce peut partir/i }),
    ).toBeVisible();

    // La sortie honnête reste visible dans le tunnel.
    await expect(
      page.getByRole("button", { name: /Je préfère faire ça plus tard/i }),
    ).toBeVisible();
    await page.screenshot({ path: "test-results/tunnel-a-setup-screen.png" });
  });

  test("B. Sortie plus tard depuis le tunnel, modale différée au tableau de bord", async ({ page }) => {
    await installTunnelMocks(page, { flagEnabled: true, affinityComplete: true });
    await page.goto(CREATE_URL);

    // Affinité déjà satisfaite : pas de redirection, mise en route directe.
    await expect(
      page.getByRole("heading", { name: /éléments et votre annonce peut partir/i }),
    ).toBeVisible({ timeout: 15_000 });
    expect(page.url()).toContain("/sits/create");

    await page.getByRole("button", { name: /Je préfère faire ça plus tard/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    // La modale d'onboarding, masquée dans le tunnel, revient au tableau de bord.
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: "test-results/tunnel-b-dashboard-modal.png" });
  });
});

test.describe("Tunnel mobile 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("C. L'écran de mise en route tient en 390 px sans débordement", async ({ page }) => {
    await installTunnelMocks(page, { flagEnabled: true, affinityComplete: true });
    await page.goto(CREATE_URL);
    await expect(
      page.getByRole("heading", { name: /éléments et votre annonce peut partir/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /Je préfère faire ça plus tard/i }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: "test-results/tunnel-c-mobile-390.png" });
  });
});
