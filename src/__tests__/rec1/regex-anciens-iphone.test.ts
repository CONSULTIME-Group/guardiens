/**
 * Lot REC1 : aucune assertion arrière dans le code chargé par le navigateur.
 * Safari iOS avant 16.4 refuse d'analyser un fichier qui contient « (?<= » ou
 * « (?<! » : la page entière reste blanche (accueil, articles, pages villes
 * le 22/11/2026).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { cityTitleCase } from "@/components/landing/HomeProximitySearch";
import { splitSentences } from "@/lib/profileQuote";
import { projetParagraphs, projetSections } from "@/lib/projets";

const LOOKBEHIND = /\(\?<[=!]/;
const isTest = (f: string) => f.includes("__tests__") || /\.test\.[tj]sx?$/.test(f);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.[tj]sx?$/.test(name) && !isTest(full)) out.push(full);
  }
  return out;
}

/** Fichiers du serveur que le site importe, suivis de proche en proche. */
function sharedReachable(siteFiles: string[]): string[] {
  const seen = new Set<string>();
  const queue: string[] = [];
  const push = (from: string, spec: string) => {
    if (!spec.includes("supabase/functions/") && !from.includes("supabase/functions/")) return;
    if (!spec.startsWith(".")) return;
    const base = resolve(dirname(from), spec);
    const hit = [base, `${base}.ts`, `${base}.js`, `${base}.tsx`].find((c) => existsSync(c) && statSync(c).isFile());
    if (hit && hit.includes("supabase/functions/") && !seen.has(hit)) { seen.add(hit); queue.push(hit); }
  };
  const importsOf = (file: string) => [...readFileSync(file, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  for (const f of siteFiles) for (const spec of importsOf(f)) push(f, spec);
  while (queue.length) { const f = queue.pop()!; for (const spec of importsOf(f)) push(f, spec); }
  return [...seen];
}

describe("REC1, expressions régulières lisibles par les anciens iPhone", () => {
  const siteFiles = walk("src");
  it("aucune assertion arrière dans src", () => {
    const hits = siteFiles.filter((f) => readFileSync(f, "utf8").split("\n").some((l) => LOOKBEHIND.test(l) && !/^\s*(\/\/|\*)/.test(l)));
    expect(hits).toEqual([]);
  });
  it("aucune assertion arrière dans les fichiers serveur que le site importe", () => {
    const shared = sharedReachable(siteFiles);
    expect(shared.length).toBeGreaterThan(0);
    const hits = shared.filter((f) => readFileSync(f, "utf8").split("\n").some((l) => LOOKBEHIND.test(l) && !/^\s*(\/\/|\*)/.test(l)));
    expect(hits).toEqual([]);
  });

  it("les noms de ville gardent leur casse", () => {
    expect(cityTitleCase("aix-en-provence")).toBe("Aix-en-Provence");
    expect(cityTitleCase("saint-cyr-au-mont-d'or")).toBe("Saint-Cyr-au-Mont-d'Or");
    expect(cityTitleCase("l'isle-adam")).toBe("L'Isle-Adam");
    expect(cityTitleCase("  la   rochelle ")).toBe("La Rochelle");
    expect(cityTitleCase("les sables-d'olonne")).toBe("Les Sables-d'Olonne");
    expect(cityTitleCase("villeneuve-lès-avignon")).toBe("Villeneuve-lès-Avignon");
  });
  it("le découpage en phrases garde la ponctuation", () => {
    expect(splitSentences("J'aime les chats. Je garde souvent !\nEt les chiens… Aussi.")).toEqual(["J'aime les chats.", "Je garde souvent !", "Et les chiens…", "Aussi."]);
    expect(projetParagraphs("Une phrase. Deux phrases. Trois phrases.")).toEqual(["Une phrase. Deux phrases.", "Trois phrases."]);
  });
  it("les rubriques d'un projet se lisent comme avant", () => {
    expect(projetSections("En bref : un potager partagé. Lieu : Lyon 5e. Ce qu'on va faire : planter des tomates")).toEqual({
      "En bref": "Un potager partagé.",
      Lieu: "Lyon 5e.",
      "Ce qu'on va faire": "Planter des tomates.",
    });
    expect(projetSections("Bonjour. En bref : un potager.")).toBeNull();
    expect(projetSections("Un texte sans rubrique.")).toBeNull();
  });
});
