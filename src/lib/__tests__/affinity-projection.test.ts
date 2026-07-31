/**
 * Test 1 — Projection des colonnes d'affinité.
 *
 * La liste attendue n'est PAS recopiée à la main : elle est dérivée du code
 * source de `src/lib/affinityScore.ts`, en relevant tous les accès `sitter.X`
 * réellement consommés par `computeAffinityResultFull` et ses fonctions
 * auxiliaires. Les projections sont, elles aussi, extraites du source des
 * appelants. Le test casse donc dans les deux sens : colonne retirée d'une
 * projection, ou colonne ajoutée à la formule sans être ajoutée à la
 * projection.
 *
 * Note : `SearchSitter.tsx` (moteur annonces) ne calcule aucun score
 * d'affinité, il n'a donc pas de projection gardien à contrôler. Le moteur qui
 * consomme la formule côté gardiens est `SearchOwner.tsx`, contrôlé ici.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/** Colonnes gardien réellement lues par la formule. */
function consumedSitterColumns(): string[] {
  const src = read("src/lib/affinityScore.ts");
  const cols = new Set<string>();
  for (const m of src.matchAll(/\bsitter\.([a-z_]+)\b/g)) cols.add(m[1]);
  return [...cols].sort();
}

/** Toutes les colonnes demandées par les `.select(...)` d'un fichier. */
function projectedColumns(path: string, tables: string[]): Set<string> {
  const src = read(path);
  const cols = new Set<string>();
  for (const table of tables) {
    const re = new RegExp(
      `from\\(\\s*["'\`]${table}["'\`]\\s*\\)[\\s\\S]{0,2000}?\\.select\\(\\s*["'\`]([^"'\`]+)["'\`]`,
      "g",
    );
    for (const m of src.matchAll(re)) {
      m[1].split(",").forEach((c) => {
        const name = c.trim().split(/[\s(:]/)[0];
        if (name) cols.add(name);
      });
    }
  }
  return cols;
}

describe("projection des colonnes d'affinité", () => {
  const consumed = consumedSitterColumns();

  it("la formule consomme bien un jeu de colonnes non vide", () => {
    expect(consumed.length).toBeGreaterThan(5);
  });

  it("SearchOwner projette toutes les colonnes consommées par computeAffinityResultFull", () => {
    const projected = projectedColumns("src/components/search/SearchOwner.tsx", [
      "public_sitter_profiles",
      "sitter_profiles_affinity",
    ]);
    const missing = consumed.filter((c) => !projected.has(c));
    expect(missing, `colonnes absentes de la projection SearchOwner : ${missing.join(", ")}`).toEqual([]);
  });

  it("useOwnerTopAffinitySitters projette toutes les colonnes consommées", () => {
    const projected = projectedColumns("src/hooks/useOwnerTopAffinitySitters.ts", ["sitter_profiles"]);
    const missing = consumed.filter((c) => !projected.has(c));
    expect(missing, `colonnes absentes de la projection useOwnerTopAffinitySitters : ${missing.join(", ")}`).toEqual([]);
  });
});
