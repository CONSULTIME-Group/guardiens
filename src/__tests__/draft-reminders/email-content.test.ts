// Contenu réel de l'email de relance, rendu hors réseau : cas complet,
// incomplet, liste inconnue, lien vers le bon champ, lecture sur téléphone,
// désinscription et signaux anti-spam.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as ReactEmail from "@react-email/components";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { draftReminderUrl, missingDraftItems } from "../../../supabase/functions/_shared/sit-draft-missing";
import { getEmailCategory } from "../../../supabase/functions/_shared/email-categories";

const cache = new Map<string, Record<string, unknown>>();
function loadTsx(file: string): Record<string, any> {
  const abs = resolve(file);
  if (cache.has(abs)) return cache.get(abs)!;
  const exports: Record<string, unknown> = {};
  cache.set(abs, exports);
  const { outputText } = ts.transpileModule(readFileSync(abs, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  });
  runInNewContext(outputText, {
    exports, console, URL,
    require: (spec: string) => {
      if (spec.startsWith("npm:react@")) return React;
      if (spec.startsWith("npm:@react-email/components")) return ReactEmail;
      if (spec.startsWith(".")) return loadTsx(resolve(dirname(abs), spec));
      throw new Error(`Unexpected import ${spec}`);
    },
  });
  return exports;
}

const { template } = loadTsx("supabase/functions/_shared/transactional-email-templates/sit-draft-reminder.tsx");
const render = (props: Record<string, unknown>) => renderToStaticMarkup(React.createElement(template.component, props));
const SIT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("email de relance de brouillon", () => {
  it("brouillon incomplet : liste nommée et bouton vers le premier champ manquant", () => {
    const missing = missingDraftItems({ title: "Garde à Lyon", start_date: "2099-01-01", end_date: "2099-01-10", city: "Lyon", hasProperty: true, hasPhoto: false, absence_reason: "", sitter_expectations: "" }, "2026-11-07");
    const ids = missing.map(m => m.id);
    expect(ids).toEqual(expect.arrayContaining(["desc-reason", "desc-expectations", "photo"]));
    const url = draftReminderUrl(SIT, missing);
    const html = render({ firstName: "Camille", title: "Garde à Lyon", missingItems: missing, resumeUrl: url });
    expect(html).toContain("Reprenons votre annonce");
    expect(html).toContain("il reste à compléter");
    for (const m of missing) expect(html).toContain(m.label.replace(/'/g, "&#x27;"));
    expect(html).toContain("Compléter mon annonce");
    const href = new URL(html.match(/href="([^"]+sits\/create[^"]+)"/)![1].replace(/&amp;/g, "&"));
    expect(href.origin + href.pathname).toBe("https://guardiens.fr/sits/create");
    expect(href.searchParams.get("resume")).toBe(SIT);
    expect(href.searchParams.get("focus")).toBe(missing[0].id);
    expect(template.subject({ missingItems: missing })).toBe("Votre brouillon vous attend : terminez votre annonce");
  });
  it("brouillon complet : rien à compléter, seulement vérifier et publier", () => {
    const html = render({ firstName: "Camille", title: "Garde à Lyon", missingItems: [], resumeUrl: draftReminderUrl(SIT, []) });
    expect(html).toContain("Votre annonce est prête à être publiée");
    expect(html).toContain("Vérifier et publier mon annonce");
    expect(html).not.toContain("il reste à compléter");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("focus=");
    expect(template.subject({ missingItems: [] })).toBe("Votre annonce est prête : il reste à la publier");
  });
  it("liste inconnue : jamais présenté comme complet", () => {
    const html = render({ firstName: "", title: "" });
    expect(html).not.toContain("prête à être publiée");
    expect(html).toContain("Bonjour,");
    expect(template.subject({})).not.toContain("prête");
  });
  it("chaque champ visé par le lien existe dans le formulaire de création", () => {
    const createSit = readFileSync(resolve("src/pages/CreateSit.tsx"), "utf8");
    expect(createSit).toContain('searchParams.get("focus")');
    const rules = readFileSync(resolve("supabase/functions/_shared/sit-publish-rules.ts"), "utf8");
    for (const id of ["title", "dates", "desc-reason", "desc-expectations", "photo", "city"]) expect(rules, id).toContain(`id: "${id}"`);
  });
  it("lisible sur téléphone : largeur bornée, bouton bloc, texte de 14 px au moins", () => {
    const html = render({ firstName: "Camille", missingItems: [{ id: "photo", label: "Une photo" }], resumeUrl: draftReminderUrl(SIT, [{ id: "photo", label: "x" }]) });
    expect(html).toMatch(/max-width:\s*560px/);
    expect(html).toMatch(/display:\s*inline-block/);
    expect(html).not.toMatch(/font-size:\s*1[0-2]px/);
    expect(html).not.toMatch(/width="[6-9]\d\d"/);
  });
  it("désinscription et anti-spam : catégorie produit (lien et en-tête de désinscription ajoutés à l'envoi), aucun script, objet sobre", () => {
    expect(getEmailCategory("sit-draft-reminder")).toBe("product");
    const sender = readFileSync(resolve("supabase/functions/send-transactional-email/index.ts"), "utf8");
    expect(sender).toMatch(/const headers: Record<string, string> = \{\}\s*if \(category !== 'transactional'\) \{[\s\S]{0,500}headers\['List-Unsubscribe-Post'\] = 'List-Unsubscribe=One-Click'/);
    const html = render({ firstName: "Camille", missingItems: [], resumeUrl: draftReminderUrl(SIT, []) });
    expect(html).not.toMatch(/<script|javascript:/i);
    expect(html).not.toContain("—");
    for (const s of [template.subject({ missingItems: [] }), template.subject({})]) {
      expect(s.length).toBeLessThanOrEqual(60);
      expect(s).not.toMatch(/!|€|gratuit|urgent|[A-Z]{4,}|—/i);
    }
  });
});
