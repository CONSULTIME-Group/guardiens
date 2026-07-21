/**
 * Tests Playwright, funnel signup — protection contre régression.
 *
 * Vague 43 : la case CGU a été unifiée en une seule case à l'étape 2, juste
 * au-dessus des boutons de soumission (email ET Google). L'étape 1 se limite
 * au choix du rôle. Le mot de passe suggéré est cryptographiquement sûr.
 */
import { test, expect } from "../playwright-fixture";

const REGISTER_URL = "http://localhost:8080/inscription";

// Utilitaire : intercepte l'appel Supabase signup et renvoie le mock demandé.
async function mockSupabaseSignup(page: any, response: { status: number; body: any }) {
  await page.route("**/auth/v1/signup**", (route: any) =>
    route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    })
  );
}

async function goToStep2(page: any) {
  await page.goto(REGISTER_URL);
  await page.getByRole("button", { name: /Gardien/i }).first().click();
  await page.getByRole("button", { name: /Continuer/i }).click();
  // La case CGU vit désormais à l'étape 2.
  await expect(page.getByLabel(/J'accepte les/i)).toBeVisible();
}

test.describe.parallel("Signup flow — vague 43 (CGU unifiée)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/rest/v1/analytics_events**", (route: any) =>
      route.fulfill({ status: 201, body: "{}" })
    );
  });

  test("1.1 CGU unique à l'étape 2 bloque email et Google si non cochée", async ({ page }) => {
    await goToStep2(page);

    // Google sans CGU cochée : bloqué avec message clair.
    await page.getByRole("button", { name: /Continuer avec Google/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();

    // On coche, on remplit, on soumet : la validation CGU passe.
    await page.getByRole("checkbox").first().check();
    await page.getByLabel(/Email/i).first().fill(`ok+${Date.now()}@guardiens.test`);
    await page.getByLabel(/Mot de passe/i).fill("MotDePasseFort2026!");
    // Le bouton de soumission est actionnable.
    await expect(page.getByRole("button", { name: /Créer mon compte/i })).toBeEnabled();
  });

  test("1.2 Meter password évolue selon la force saisie", async ({ page }) => {
    await goToStep2(page);

    const passwordInput = page.getByLabel(/Mot de passe/i);
    await passwordInput.fill("bonjour");
    await expect(page.getByText(/Trop court/i)).toBeVisible();

    await passwordInput.fill("bonjour1");
    await expect(page.getByText(/Trop court/i)).toHaveCount(0);

    await passwordInput.fill("MotDePasseFort2026!");
    await expect(page.getByText(/Excellent|Bon mot de passe/i)).toBeVisible();
  });

  test("1.3 Bouton 'Suggérer un mot de passe fort' remplit + révèle le password", async ({ page }) => {
    await goToStep2(page);

    await page.getByRole("button", { name: /Suggérer un mot de passe fort/i }).click();

    const passwordInput = page.getByLabel(/Mot de passe/i);
    const value = await passwordInput.inputValue();
    expect(value.length).toBeGreaterThanOrEqual(12);
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(page.getByText(/Excellent|Bon mot de passe/i)).toBeVisible();
  });

  test("1.4 Blacklist password affiche l'avertissement inline", async ({ page }) => {
    await goToStep2(page);
    await page.getByLabel(/Mot de passe/i).fill("guardiens");
    await expect(
      page.getByText(/apparaît dans les listes des plus utilisés/i)
    ).toBeVisible();
  });

  test("1.5 Erreur Supabase inconnue : formError persistant, aucun toast destructif", async ({ page }) => {
    await mockSupabaseSignup(page, {
      status: 500,
      body: { error: "server_error", msg: "internal boom" },
    });

    await goToStep2(page);
    await page.getByRole("checkbox").first().check();
    await page.getByLabel(/Email/i).first().fill(`e2e+${Date.now()}@guardiens.test`);
    await page.getByLabel(/Mot de passe/i).fill("MotDePasseFort2026!");
    await page.getByRole("button", { name: /Créer mon compte/i }).click();

    const alert = page.getByRole("alert").first();
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("[data-sonner-toast][data-type='error']")).toHaveCount(0);
  });

  test("1.6 Email déjà existant : dialog 'Se connecter' proposé", async ({ page }) => {
    await mockSupabaseSignup(page, {
      status: 400,
      body: { code: "user_already_exists", msg: "User already registered" },
    });

    await goToStep2(page);
    await page.getByRole("checkbox").first().check();
    await page.getByLabel(/Email/i).first().fill("existing@guardiens.test");
    await page.getByLabel(/Mot de passe/i).fill("MotDePasseFort2026!");
    await page.getByRole("button", { name: /Créer mon compte/i }).click();

    await expect(
      page.getByRole("button", { name: /Se connecter/i })
        .or(page.getByRole("link", { name: /Se connecter/i }))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("1.7 Intent owner déduit du redirect /gardiens/… pré-sélectionne rôle et affiche bandeau", async ({ page }) => {
    await page.goto(`${REGISTER_URL}?redirect=%2Fgardiens%2Fabc-123`);
    // On arrive directement à l'étape 2 avec rôle "Propriétaire" et bandeau contextuel.
    await expect(page.getByText(/Encore un pas, et vous pourrez contacter ce gardien/i)).toBeVisible();
    await expect(page.getByText(/Propriétaire/i).first()).toBeVisible();
  });
});
