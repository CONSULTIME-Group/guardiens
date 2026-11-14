// Lot ALR6 (14/11/2026) : le désabonnement en un clic coupe la famille de
// l'email reçu, jamais la messagerie. Audit du système d'alertes du 14/11/2026,
// constat A8, et demande de Jérémie : « il faut le faire aussi la gestion des emails ».
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const handler = read("supabase/functions/handle-email-unsubscribe/index.ts");
const sender = read("supabase/functions/send-transactional-email/index.ts");
const prefsPage = read("src/pages/EmailPreferences.tsx");
const sql = read("drizzle/migrations/0160_alr6_reglage_desinscription.sql");
const fr = JSON.parse(read("src/i18n/locales/fr/common.json"));

describe("ALR6 · désabonnement par famille", () => {
  it("l'en-tête de désabonnement porte la famille de l'email", () => {
    expect(sender).toMatch(/&category=\$\{encodeURIComponent\(String\(category\)\)\}/);
    // L'alerte sortie garde sa portée propre (lot SORT4).
    expect(sender).toMatch(/OUTING_ALERT_TEMPLATE \? '&scope=outing'/);
  });

  it("le clic coupe une famille, et sans famille les trois, sans liste de suppression", () => {
    expect(handler).toMatch(/if \(category && FAMILIES\.includes\(category\)\) oneClickFamily = category/);
    expect(handler).toMatch(/else oneClickAllFamilies = true/);
    expect(handler).toMatch(/categoriesPayload = \{ product: false, digest: false, alert: false \}/);
    // Plus aucune inscription dans suppressed_emails depuis ce point d'entrée.
    expect(handler).not.toMatch(/\.from\('suppressed_emails'\)\s*\.upsert/);
  });

  it("rallumer une famille lève une ancienne désinscription totale et réactive le jeton", () => {
    expect(handler).toMatch(/\.eq\('reason', 'unsubscribe'\)/);
    expect(handler).toMatch(/update\(\{ used_at: null \}\)/);
    expect(handler).toMatch(/valid: true,\s*already_unsubscribed: false/);
  });

  it("la page Préférences email lève la désinscription quand une famille reste allumée", () => {
    expect(prefsPage).toMatch(/supabase\.rpc\("lift_my_unsubscribe" as any\)/);
    expect(prefsPage).toMatch(/keepsAFamily/);
    expect(sql).toContain("alr6_reglage_desinscription");
    expect(sql).toContain("s.reason = 'unsubscribe'");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.lift_my_unsubscribe() FROM anon;");
  });

  it("la page de désinscription dit que les messages des membres continuent", () => {
    expect(fr.unsubscribe.success_all_desc).toMatch(/messages des membres/);
    expect(fr.unsubscribe.intro).toMatch(/messages des membres/);
    for (const v of Object.values(fr.unsubscribe) as string[]) {
      expect(v).not.toMatch(/[–—]/);
    }
  });
});
