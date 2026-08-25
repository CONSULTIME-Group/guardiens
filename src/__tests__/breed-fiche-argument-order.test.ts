/**
 * Verrou d'ordre des arguments de resolveBreedFiche(species, declaredBreed, candidates).
 *
 * La fonction commence par filtrer les fiches sur l'espèce. Avec les deux
 * premiers arguments inversés, aucun candidat ne survit au filtre et la
 * fonction retourne null en silence : la fonctionnalité s'éteint sans erreur.
 * Ce fichier verrouille deux choses : le comportement (bon ordre = fiche,
 * mauvais ordre = null) et l'écriture des appels dans les sources.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { resolveBreedFiche } from "@/lib/breedFicheMatch";

const fiches = [
  { species: "dog", breed: "berger australien" },
  { species: "cat", breed: "maine coon" },
];

describe("resolveBreedFiche : ordre des arguments", () => {
  it("retourne la fiche avec l'ordre (species, breed, candidates)", () => {
    expect(resolveBreedFiche("dog", "Berger Australien", fiches)?.breed).toBe("berger australien");
  });

  it("retourne null si les deux premiers arguments sont inversés", () => {
    expect(resolveBreedFiche("Berger Australien", "dog", fiches)).toBeNull();
  });
});

const ROOTS = ["src", "supabase/functions"];
const EXTENSIONS = [".ts", ".tsx"];
const SPECIES_HINT = /(species|espece|espèce)/i;

const walk = (dir: string, acc: string[] = []): string[] => {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (EXTENSIONS.some((ext) => full.endsWith(ext))) acc.push(full);
  }
  return acc;
};

describe("appels à resolveBreedFiche dans les sources", () => {
  it("passe toujours une espèce en premier argument", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root)) {
        const content = readFileSync(file, "utf8");
        if (!content.includes("resolveBreedFiche(")) continue;
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          const match = line.match(/resolveBreedFiche\(\s*([^,]+),/);
          if (!match) return;
          const firstArg = match[1].trim();
          // Les définitions et ré-exportations ne sont pas des appels.
          if (line.includes("export const resolveBreedFiche")) return;
          if (!SPECIES_HINT.test(firstArg)) {
            offenders.push(`${file}:${index + 1} : ${line.trim()}`);
          }
        });
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
