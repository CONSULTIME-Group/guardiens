/**
 * Test 4 — Filtre « type de logement » (SearchSitter).
 *
 * Le prédicat n'est pas recopié : il est extrait du source de SearchSitter.tsx
 * puis évalué. Deux cases cochées doivent renvoyer l'union, jamais l'ensemble
 * vide (régression de l'intersection implicite).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/components/search/SearchSitter.tsx"), "utf8");

function extractHousingPredicate(): (housingTypes: string[]) => (s: any) => boolean {
  const m = src.match(/housingTypes\.length > 0\)[^\n]*?\.filter\(([\s\S]*?)\);/);
  if (!m) throw new Error("prédicat de filtre logement introuvable dans SearchSitter.tsx");
  const body = m[1].replace(/:\s*any/g, "");
  // eslint-disable-next-line no-new-func
  return new Function("housingTypes", `return (${body});`) as any;
}

const rows = [
  { id: "a", property: { type: "house" } },
  { id: "b", property: { type: "apartment" } },
  { id: "c", property: { type: "farm" } },
  { id: "d", property: null },
];

describe("filtre type de logement", () => {
  const make = extractHousingPredicate();

  it("une case cochée renvoie les annonces de ce type", () => {
    expect(rows.filter(make(["house"])).map((r) => r.id)).toEqual(["a"]);
  });

  it("deux cases cochées renvoient l'union, pas un ensemble vide", () => {
    const out = rows.filter(make(["house", "apartment"])).map((r) => r.id);
    expect(out.length, "deux types cochés ne doivent jamais vider la liste").toBeGreaterThan(0);
    expect(out).toEqual(["a", "b"]);
  });

  it("trois cases cochées cumulent aussi", () => {
    expect(rows.filter(make(["house", "apartment", "farm"])).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("une annonce sans logement renseigné n'est jamais retenue", () => {
    expect(rows.filter(make(["house", "apartment"])).some((r) => r.id === "d")).toBe(false);
  });
});
