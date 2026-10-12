/**
 * Lot E11 (12/10/2026) : les besoins ouverts ailleurs restent visibles.
 *
 * Constat du 12/10 : autour de Lyon, 0 besoin à 30 km et 12 ouverts ailleurs,
 * tous repliés sous un petit lien souligné. La page semblait vide.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FAR_NEEDS_OPEN_BELOW, farNeedsHeading, farNeedsLabel, farNeedsOpenByDefault } from "@/lib/entraideIdeas";

describe("E11, besoins ailleurs en France", () => {
  it("affichés d'emblée sous 3 besoins proches", () => {
    expect(FAR_NEEDS_OPEN_BELOW).toBe(3);
    expect(farNeedsOpenByDefault(true, 0)).toBe(true);
    expect(farNeedsOpenByDefault(true, 2)).toBe(true);
    expect(farNeedsOpenByDefault(true, 3)).toBe(false);
  });

  it("sans lieu connu, le repli reste la règle", () => {
    expect(farNeedsOpenByDefault(false, 0)).toBe(false);
  });

  it("titres et libellés", () => {
    expect(farNeedsHeading(12)).toBe("Ailleurs en France, 12 besoins ouverts");
    expect(farNeedsHeading(1)).toBe("Ailleurs en France, 1 besoin ouvert");
    expect(farNeedsLabel(8, true)).toBe("Plus loin : 8 besoins ouverts ailleurs en France");
  });

  it("câblage de la page : titre ouvert, sinon un vrai bouton", () => {
    const src = readFileSync("src/pages/EntraideHub.tsx", "utf8");
    expect(src).toContain("farNeedsOpenByDefault(origin !== null, nearNeeds.length)");
    expect(src).toContain("farNeedsHeading(farNeeds.length)");
    expect(src).toMatch(/<Button\s+type="button"\s+variant="outline"\s+aria-expanded=\{farShown\}/);
    expect(src).toContain('hidden={!farShown}');
  });
});
