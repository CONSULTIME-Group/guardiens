/**
 * Rapport d'erreurs du 29/10/2026 : /races/bird-perroquet-gris-du-gabon
 * (11 occurrences en 404). La fiche cible de la fusion est absente de la
 * base, la source « gris du gabon » est servie : l'ancienne URL de la cible
 * redirige vers la source.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { liveMergedBreedSource } from "@/lib/breedFicheMerges";

describe("fiche cible absente, source servie", () => {
  const onlySource = [{ species: "bird", breed: "gris du gabon" }];
  it("l'ancienne URL de la cible mène à la source", () => {
    expect(liveMergedBreedSource("bird", "perroquet-gris-du-gabon", onlySource)).toBe("gris du gabon");
  });
  it("cible présente : aucun renvoi, la fiche cible reste servie", () => {
    const rows = [...onlySource, { species: "bird", breed: "perroquet gris du gabon" }];
    expect(liveMergedBreedSource("bird", "perroquet-gris-du-gabon", rows)).toBeNull();
  });
  it("slug sans fusion déclarée : reste un vrai 404", () => {
    expect(liveMergedBreedSource("bird", "perroquet-inconnu", onlySource)).toBeNull();
    expect(liveMergedBreedSource("dog", "perroquet-gris-du-gabon", onlySource)).toBeNull();
  });
  it("BreedPage branche le renvoi avant le 404", () => {
    const src = readFileSync("src/pages/BreedPage.tsx", "utf8");
    expect(src).toMatch(/liveMergedBreedSource\(prefix, breedSlug/);
  });
});
