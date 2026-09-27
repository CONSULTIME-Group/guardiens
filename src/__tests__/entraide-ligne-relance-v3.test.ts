import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8");
const TPL = read("supabase/functions/_shared/transactional-email-templates/entraide-ligne-relance.tsx");

describe("gabarit entraide-ligne-relance (E8)", () => {
  it("objet, preview, images en JPEG absolues, aucun svg ni webp", () => {
    expect(TPL).toContain("subject: 'Rendre service fait du bien. À vous aussi.'");
    expect(TPL).toContain("<Preview>Une partie de belote, un coup de main au potager : dites en une phrase ce que vous aimez faire.</Preview>");
    expect(TPL).toContain("const IMG = 'https://guardiens.fr/email'");
    expect(TPL).not.toMatch(/\.webp|<svg/i);
    expect(TPL).not.toMatch(/[\u2013\u2014]/);
    expect(TPL.toLowerCase()).not.toMatch(/voisin|gratuit/);
  });
  it("les images existent dans public/email", () => {
    for (const f of ["entraide-mains", "exemple-nadia", "exemple-giulia", "exemple-rania", "elisa", "jeremie"]) {
      expect(statSync(`public/email/${f}.jpg`).size).toBeGreaterThan(1000);
    }
  });
});

describe("send-mass-email transmet city et avatarUrl", () => {
  const src = read("supabase/functions/send-mass-email/index.ts");
  it("avatar_url sélectionné et carte injectée pour ce gabarit", () => {
    expect(src).toMatch(/\.select\("id, email, first_name, postal_code, city, avatar_url,/);
    expect(src).toContain('...(templateName === "entraide-ligne-relance" ? (cardByEmail.get(email.toLowerCase()) ?? {}) : {})');
  });
});

describe("test fidèle depuis l'admin", () => {
  const src = read("supabase/functions/admin-send-test-email/index.ts");
  it("template_name emprunte send-transactional-email, sinon chemin générique", () => {
    const branch = src.slice(src.indexOf("if (templateName) {"), src.indexOf("if (!subject || !body)"));
    expect(branch).toContain('invoke("send-transactional-email"');
    expect(branch).toContain("idempotencyKey: `admin-test-${templateName}-${Date.now()}`");
    expect(branch).toContain("__urgent: true");
    expect(branch).not.toContain("resendFetch");
    expect(src.slice(src.indexOf("if (!subject || !body)"))).toContain("resendFetch(");
  });
  it("le bouton de test transmet template_name", () => {
    expect(read("src/pages/admin/AdminMassEmails.tsx")).toContain("template_name: filters.template_name || undefined");
  });
});

describe("ligne de réassurance du gabarit générique supprimée", () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs|js)$/.test(p) ? [p] : [];
  });
  it("aucune occurrence dans supabase/functions ni src", () => {
    const needle = ["3 minutes", "c'est tout"].join(", ");
    const hits = [...walk("supabase/functions"), ...walk("src")].filter((p) => read(p).includes(needle));
    expect(hits).toEqual([]);
  });
});
