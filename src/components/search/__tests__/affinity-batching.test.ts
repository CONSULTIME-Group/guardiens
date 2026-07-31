/**
 * Test 6 — Découpage par lots de l'appel d'affinité (SearchOwner).
 *
 * Le bloc de découpage est extrait du source et évalué tel quel : avec 820
 * identifiants, l'appel `.in()` doit être découpé en lots d'au plus 200, et
 * l'union des lots doit être complète, sans doublon ni perte.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/components/search/SearchOwner.tsx"), "utf8");

function buildBatches(ids: string[]): string[][] {
  const m = src.match(/const AFFINITY_BATCH = (\d+);[\s\S]*?for \(let i = 0[\s\S]*?\n\s*\}/);
  if (!m) throw new Error("bloc de découpage par lots introuvable dans SearchOwner.tsx");
  const code = m[0].replace(/:\s*string\[\]\[\]/g, "");
  // eslint-disable-next-line no-new-func
  return new Function("sitterUserIds", `${code}\nreturn batches;`)(ids);
}

const ids = Array.from({ length: 820 }, (_, i) => `u-${i}`);

describe("découpage par lots de l'appel d'affinité", () => {
  it("le lot est plafonné à 200 identifiants", () => {
    expect(src).toMatch(/const AFFINITY_BATCH = 200;/);
    const batches = buildBatches(ids);
    expect(Math.max(...batches.map((b) => b.length))).toBeLessThanOrEqual(200);
  });

  it("820 identifiants produisent 5 lots", () => {
    expect(buildBatches(ids).map((b) => b.length)).toEqual([200, 200, 200, 200, 20]);
  });

  it("l'union des lots est complète, sans doublon ni perte", () => {
    const flat = buildBatches(ids).flat();
    expect(flat.length).toBe(ids.length);
    expect(new Set(flat).size).toBe(ids.length);
    expect(flat.sort()).toEqual([...ids].sort());
  });

  it("la fusion des résultats par user_id couvre tous les lots", () => {
    const batches = buildBatches(ids);
    const responses = batches.map((b) => ({ data: b.map((id) => ({ user_id: id, life_pace: "calme" })) }));
    const map = new Map<string, any>();
    responses.forEach((res) => res.data.forEach((a: any) => map.set(a.user_id, a)));
    expect(map.size).toBe(820);
  });
});
