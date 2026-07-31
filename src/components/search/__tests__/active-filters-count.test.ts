/**
 * Test 8 — Compteur de filtres actifs (SearchSitter).
 *
 * L'expression est extraite du source et évaluée : au chargement initial, sans
 * aucun filtre, le compteur doit valoir zéro. `radius` et `zoneMode` ont leur
 * propre puce visible, ils n'entrent pas dans le décompte.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/components/search/SearchSitter.tsx"), "utf8");

function extractExpression(): string {
  const m = src.match(/const activeFiltersCount =([\s\S]*?);\n/);
  if (!m) throw new Error("expression activeFiltersCount introuvable dans SearchSitter.tsx");
  return m[1];
}

const ARGS = [
  "housingTypes",
  "environments",
  "verifiedOnly",
  "withPhotosOnly",
  "animalTypes",
  "startDate",
  "endDate",
  "duration",
  "emergencyOnly",
  "radius",
  "zoneMode",
];

function evaluate(state: Record<string, any>): number {
  // eslint-disable-next-line no-new-func
  const fn = new Function(...ARGS, `return (${extractExpression()});`);
  return fn(...ARGS.map((k) => state[k]));
}

const INITIAL = {
  housingTypes: [],
  environments: [],
  verifiedOnly: false,
  withPhotosOnly: false,
  animalTypes: [],
  startDate: null,
  endDate: null,
  duration: "all",
  emergencyOnly: false,
  radius: [30],
  zoneMode: "radius",
};

describe("compteur de filtres actifs", () => {
  it("vaut zéro au chargement initial, sans filtre", () => {
    expect(evaluate(INITIAL)).toBe(0);
  });

  it("ignore radius et zoneMode", () => {
    expect(evaluate({ ...INITIAL, radius: [100], zoneMode: "france" })).toBe(0);
    expect(extractExpression()).not.toMatch(/\bradius\b/);
    expect(extractExpression()).not.toMatch(/\bzoneMode\b/);
  });

  it("compte les vrais filtres", () => {
    expect(evaluate({ ...INITIAL, housingTypes: ["house", "farm"] })).toBe(2);
    expect(evaluate({ ...INITIAL, verifiedOnly: true, emergencyOnly: true })).toBe(2);
  });
});
