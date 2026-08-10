import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CATEGORIES = path.join(ROOT, "supabase/functions/_shared/email-categories.ts");
const SEND_FN = path.join(ROOT, "supabase/functions/send-transactional-email/index.ts");
const TEMPLATES_DIR = path.join(ROOT, "supabase/functions/_shared/transactional-email-templates");

// On retire les commentaires : ils contiennent des apostrophes qui fausseraient
// l'extraction des chaînes entre quotes simples.
const categoriesSrc = fs
  .readFileSync(CATEGORIES, "utf8")
  .split("\n")
  .filter((l) => !l.trim().startsWith("//"))
  .join("\n");
const sendSrc = fs.readFileSync(SEND_FN, "utf8");

function listArray(name: string): string[] {
  const m = categoriesSrc.match(new RegExp(`${name}[^=]*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe("catégorisation des emails, conformité désinscription", () => {
  it("le repli par défaut est 'product', jamais 'transactional'", () => {
    // La dernière valeur retournée par getEmailCategory est le repli.
    const fn = categoriesSrc.slice(categoriesSrc.indexOf("getEmailCategory"));
    const fallback = fn.match(/return\s+'(\w+)'\s*(?:as[^\n]*)?\n?\}/);
    expect(fn).toContain("console.warn");
    expect(fallback?.[1] ?? "product").toBe("product");
    expect(fn).not.toMatch(/return\s+'transactional'\s*\n?\}/);
  });

  it("un template inconnu n'est pas déclaré transactionnel", () => {
    const transactional = listArray("TRANSACTIONAL");
    expect(transactional).not.toContain("template-inexistant-abc");
    expect(transactional.length).toBeGreaterThan(10);
  });

  it("les templates de nurturing et de digest ne sont pas transactionnels", () => {
    const transactional = listArray("TRANSACTIONAL");
    const marketing = [
      "discover-mutual-aid-0",
      "discover-mutual-aid-1",
      "discover-mutual-aid-2",
      "affinity-completion-owner",
      "affinity-completion-sitter",
      "reactivation-d30",
      "sitter-encourage-candidature",
      "referral-boost-monthly",
      "owner-no-sit-j3",
      "owner-no-sit-j10",
      "owner-no-sit-j21",
      "sitter-daily-digest",
      "mission-daily-digest",
      "nearby-daily-digest",
      "mutual-aid-weekly-digest",
      "alert-digest",
      // 'unread-messages-reminder' est volontairement transactionnel depuis le
      // 10/08/2026 : il porte le message reel d'un membre identifie a un autre.
      "review-reminder",
      "dormant-sitter-nudge",
      "affinity-onboarding-nudge",
    ];
    for (const t of marketing) expect(transactional, t).not.toContain(t);
  });

  it("la catégorie digest n'est pas vide", () => {
    expect(listArray("DIGEST").length).toBeGreaterThanOrEqual(5);
  });

  it("tous les templates du répertoire sont classés ou retombent en product", () => {
    const files = fs
      .readdirSync(TEMPLATES_DIR)
      .filter((f) => f.endsWith(".tsx") && !f.startsWith("_"))
      .map((f) => f.replace(/\.tsx$/, ""));
    const declared = new Set([
      ...listArray("TRANSACTIONAL"),
      ...listArray("DIGEST"),
      ...listArray("ALERT"),
      ...listArray("PRODUCT"),
    ]);
    const missing = files.filter((f) => !declared.has(f));
    expect(missing, `templates non déclarés: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("pied de page et en-têtes de désinscription", () => {
  it("un email non transactionnel reçoit un lien tokenisé et les en-têtes RFC 8058", () => {
    expect(sendSrc).toContain("/unsubscribe?token=${unsubscribeToken}");
    expect(sendSrc).toContain("List-Unsubscribe");
    expect(sendSrc).toContain("List-Unsubscribe-Post");
    // Le lien tokenisé est dans la branche non transactionnelle du pied de page.
    const elseBranch = sendSrc.slice(sendSrc.indexOf("if (category === 'transactional')"));
    expect(elseBranch).toContain("unsubUrl");
    expect(elseBranch).toContain("unsubAllUrl");
  });

  it("le lien de préférences pointe vers la route réelle", () => {
    expect(sendSrc).toContain("${SITE_URL}/email-preferences");
    expect(sendSrc).not.toContain("/preferences-email");
  });
});

describe("aucune fonction de nurturing n'appelle Resend en direct", () => {
  it("les nudges passent par send-transactional-email", () => {
    for (const fn of [
      "nudge-sitter-dormant",
      "nudge-affinity-onboarding",
      "nudge-owner-pending-application",
    ]) {
      const src = fs.readFileSync(path.join(ROOT, `supabase/functions/${fn}/index.ts`), "utf8");
      expect(src, fn).not.toContain("api.resend.com");
      expect(src, fn).toContain("functions/v1/send-transactional-email");
    }
  });
});
