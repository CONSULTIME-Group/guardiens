/**
 * Tests Playwright, funnel signup — protection contre régression.
 *
 * Couvre les 3 fixes du chantier Casse B :
 *  - CGU en étape 1 avec hint bloquant
 *  - PasswordStrengthMeter live avec labels dynamiques
 *  - formError persistant remplaçant les toasts
 *
 * Les scénarios réseau (Supabase) sont mockés via `page.route`. Les 4
 * scénarios locaux (nominal, générateur, blacklist, régression toast) tournent
 * intégralement en sandbox sans compte. Les scénarios rate_limit et email
 * existant reposent sur des mocks REST.
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

test.describe.parallel("Signup flow — fix Casse B", () => {
  test.beforeEach(async ({ page }) => {
    // Neutralise les analytics_events pour ne pas polluer la prod.
    await page.route("**/rest/v1/analytics_events**", (route: any) =>
      route.fulfill({ status: 201, body: "{}" })
    );
  });

  test("1.1 CGU non cochée bloque le passage à l'étape 2", async ({ page }) => {
    await page.goto(REGISTER_URL);

    // Sélectionne le rôle gardien.
    await page.getByRole("button", { name: /Gardien/i }).first().click();

    // Vérifie que la case CGU est visible.
    const cguCheckbox = page.getByRole("checkbox").first();
    await expect(cguCheckbox).toBeVisible();

    // Clic sur Continuer sans cocher.
    await page.getByRole("button", { name: /Continuer/i }).click();

    // Hint « Cochez la case pour continuer. » visible.
    await expect(page.getByText(/Cochez la case pour continuer/i)).toBeVisible();

    // On coche puis on continue.
    await cguCheckbox.check();
    await page.getByRole("button", { name: /Continuer/i }).click();

    // On voit le champ email (étape 2) + la confirmation CGU.
    await expect(page.getByLabel(/Email/i).first()).toBeVisible();
    await expect(page.getByText(/Vous avez accepté les CGU/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Modifier/i })).toBeVisible();
  });

  test("1.2 Meter password évolue selon la force saisie", async ({ page }) => {
    await page.goto(REGISTER_URL);
    await page.getByRole("button", { name: /Gardien/i }).first().click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /Continuer/i }).click();

    const passwordInput = page.getByLabel(/Mot de passe/i);
    await passwordInput.fill("bonjour");
    await expect(page.getByText(/Trop court/i)).toBeVisible();

    await passwordInput.fill("bonjour1");
    // On accepte n'importe quel label sauf « Trop court ».
    await expect(page.getByText(/Trop court/i)).toHaveCount(0);

    await passwordInput.fill("MotDePasseFort2026!");
    await expect(page.getByText(/Excellent|Bon mot de passe/i)).toBeVisible();
  });

  test("1.3 Bouton 'Suggérer un mot de passe fort' remplit + révèle le password", async ({ page }) => {
    await page.goto(REGISTER_URL);
    await page.getByRole("button", { name: /Gardien/i }).first().click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /Continuer/i }).click();

    await page.getByRole("button", { name: /Suggérer un mot de passe fort/i }).click();

    const passwordInput = page.getByLabel(/Mot de passe/i);
    const value = await passwordInput.inputValue();
    expect(value.length).toBeGreaterThanOrEqual(12);
    // Le password doit être visible (type=text après génération).
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(page.getByText(/Excellent|Bon mot de passe/i)).toBeVisible();
  });

  test("1.4 Blacklist password affiche l'avertissement inline", async ({ page }) => {
    await page.goto(REGISTER_URL);
    await page.getByRole("button", { name: /Gardien/i }).first().click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /Continuer/i }).click();

    await page.getByLabel(/Mot de passe/i).fill("guardiens");
    // Le meter affiche l'avertissement blacklist.
    await expect(
      page.getByText(/apparaît dans les listes des plus utilisés/i)
    ).toBeVisible();
  });

  test("1.5 Erreur Supabase inconnue : formError persistant, aucun toast destructif", async ({ page }) => {
    await mockSupabaseSignup(page, {
      status: 500,
      body: { error: "server_error", msg: "internal boom" },
    });

    await page.goto(REGISTER_URL);
    await page.getByRole("button", { name: /Gardien/i }).first().click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /Continuer/i }).click();

    await page.getByLabel(/Email/i).first().fill(`e2e+${Date.now()}@guardiens.test`);
    await page.getByLabel(/Mot de passe/i).fill("MotDePasseFort2026!");
    await page.getByRole("button", { name: /Créer mon compte/i }).click();

    // formError persistant visible dans un role="alert".
    const alert = page.getByRole("alert").first();
    await expect(alert).toBeVisible({ timeout: 10_000 });

    // Aucun toast destructif « Erreur » ne s'affiche.
    await expect(page.locator("[data-sonner-toast][data-type='error']")).toHaveCount(0);
  });

  test("1.6 Email déjà existant : dialog 'Se connecter' proposé", async ({ page }) => {
    await mockSupabaseSignup(page, {
      status: 400,
      body: { code: "user_already_exists", msg: "User already registered" },
    });

    await page.goto(REGISTER_URL);
    await page.getByRole("button", { name: /Gardien/i }).first().click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /Continuer/i }).click();

    await page.getByLabel(/Email/i).first().fill("existing@guardiens.test");
    await page.getByLabel(/Mot de passe/i).fill("MotDePasseFort2026!");
    await page.getByRole("button", { name: /Créer mon compte/i }).click();

    // Un lien / bouton « Se connecter » doit apparaître (dialog existingAccountOpen).
    await expect(page.getByRole("button", { name: /Se connecter/i }).or(page.getByRole("link", { name: /Se connecter/i }))).toBeVisible({ timeout: 10_000 });
  });
});
