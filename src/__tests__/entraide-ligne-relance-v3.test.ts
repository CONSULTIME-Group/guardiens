import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8");
const TPL = read("supabase/functions/_shared/transactional-email-templates/entraide-ligne-relance.tsx");
const visible = [...TPL.matchAll(/'([^']*)'|"([^"]*)"|>([^<>{}]+)</g)].map((m) => m[1] ?? m[2] ?? m[3]).join("\n");
const jsxText = TPL.slice(TPL.indexOf("const QUOTES"), TPL.indexOf("const quoteBlock"));

describe("gabarit entraide-ligne-relance", () => {
  it("objet, preheader, citations, signature", () => {
    expect(TPL).toContain("subject: 'Se rendre utile, ça fait du bien'");
    expect(TPL).toContain("<Preview>Une phrase suffit, et elle fait du bien des deux côtés.</Preview>");
    for (const [q, c] of [
      ["« Aider et rendre service. Rencontrer des gens et discuter. »", "Champs-sur-Yonne"],
      ["« Aide administrative et informatique »", "Lyon"],
      ["« M'occuper des animaux, des plantes, des cultures, du jardin... »", "Fontvieille"],
    ]) { expect(TPL).toContain(q); expect(TPL).toContain(`city: '${c}'`); }
    expect(TPL).toContain("<Text style={text}>Elisa et Jérémie</Text>");
    expect(TPL).toContain("fontStyle: 'italic'");
    expect(TPL).toContain("borderLeft: '2px solid #E9E4DD'");
  });
  it("l'idée centrale précède le bouton", () => {
    const i = TPL.indexOf("Se rendre utile, c'est aussi se faire du bien.");
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(TPL.indexOf("<Button"));
  });
  it("charte : ponctuation, affirmatif, vocabulaire", () => {
    expect(TPL).not.toMatch(/[\u2013\u2014]/);
    const words = jsxText.replace(/<[^>]+>|\{[^}]*\}/g, " ");
    expect(words).not.toMatch(/\b(ne|pas|sans|jamais|rien)\b|\bn'/i);
    expect(visible.toLowerCase()).not.toMatch(/voisin|gratuit/);
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

describe("« 3 minutes, c'est tout » supprimé", () => {
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
