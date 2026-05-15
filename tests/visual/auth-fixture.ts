/**
 * Fixture Playwright — injection d'une session Supabase authentifiée.
 *
 * Usage :
 *   import { test, expect } from "./auth-fixture";
 *   test("…", async ({ authedPage }) => { await authedPage.goto("/dashboard"); });
 *
 * Pré-requis (env vars, à fournir en CI ou en local via .env.test) :
 *   - E2E_TEST_EMAIL     : email d'un compte de test pré-provisionné
 *   - E2E_TEST_PASSWORD  : mot de passe associé
 *
 * Comportement :
 *   - Si les vars manquent, les tests utilisant `authedPage` sont AUTO-SKIPPÉS
 *     (jamais d'erreur en CI publique sans secrets).
 *   - Sinon : signin REST contre Supabase, récupération du token, injection
 *     dans localStorage via `addInitScript` AVANT le premier render React.
 *     Au reload, AuthContext lit la session existante et démarre authentifié.
 *
 * Sécurité : le compte de test doit être un compte cloisonné (RLS-safe), sans
 * données privées sensibles. Ne JAMAIS utiliser un compte admin ou un compte
 * réel d'utilisateur final.
 *
 * Provisionnement initial du compte de test (à faire 1 fois manuellement) :
 *   1. Créer un user via /inscription avec email = E2E_TEST_EMAIL
 *   2. Confirmer l'email (ou désactiver la confirmation pour ce compte)
 *   3. Stocker E2E_TEST_EMAIL / E2E_TEST_PASSWORD comme secrets CI
 */
import { test as base, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://erhccyqevdyevpyctsjj.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY";

const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1] ?? "erhccyqevdyevpyctsjj";
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

export const hasAuthCreds = Boolean(TEST_EMAIL && TEST_PASSWORD);

/** Signin via Supabase REST. Cache le résultat sur la durée de la worker. */
let cachedSession: any = null;
async function getSession() {
  if (cachedSession) return cachedSession;
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error("E2E_TEST_EMAIL / E2E_TEST_PASSWORD manquants — fixture authedPage indisponible.");
  }
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (error || !data.session) {
    throw new Error(`Signin failed: ${error?.message ?? "no session"}`);
  }
  cachedSession = data.session;
  return cachedSession;
}

export async function injectSession(page: Page) {
  const session = await getSession();
  // Format attendu par @supabase/supabase-js v2 dans localStorage
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });
  await page.addInitScript(
    ({ key, value }) => {
      try { window.localStorage.setItem(key, value); } catch {}
    },
    { key: STORAGE_KEY, value: payload },
  );
}

type Fixtures = { authedPage: Page };

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    test.skip(!hasAuthCreds, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD non configurés.");
    await injectSession(page);
    await use(page);
  },
});

export { expect };
