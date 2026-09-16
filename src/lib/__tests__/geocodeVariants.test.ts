import { describe, it, expect } from "vitest";
import { cityQueryVariants, countryQueryVariants, isOverseasCountry } from "../geocodeVariants";

describe("cityQueryVariants", () => {
  it("retire les mots de tête et propose Taravao", () => {
    const variants = cityQueryVariants("Hauteur de Taravao");
    expect(variants[0]).toBe("Hauteur de Taravao");
    expect(variants).toContain("Taravao");
  });

  it("ne commence jamais une variante par un article ou une préposition", () => {
    const variants = cityQueryVariants("Hauteur de Taravao");
    expect(variants).not.toContain("de Taravao");
  });

  it("ne découpe pas un nom composé par tirets", () => {
    expect(cityQueryVariants("Saint-Denis")).toEqual(["Saint-Denis"]);
  });

  it("gère les chaînes vides", () => {
    expect(cityQueryVariants("   ")).toEqual([]);
  });
});

describe("countryQueryVariants", () => {
  it("accepte France et FR pour l'outre-mer", () => {
    expect(countryQueryVariants("PF")).toEqual(["PF", "France", "FR"]);
    expect(isOverseasCountry("NC")).toBe(true);
  });

  it("laisse les autres pays intacts", () => {
    expect(countryQueryVariants("MA")).toEqual(["MA"]);
    expect(countryQueryVariants(null)).toEqual([undefined]);
  });
});
