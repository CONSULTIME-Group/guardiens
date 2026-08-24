import { describe, it, expect } from "vitest";
import { publicFirstName } from "../displayName";

describe("publicFirstName", () => {
  it("ne garde que le prénom quand le champ porte le nom de famille", () => {
    expect(publicFirstName("Heiarii FAUA")).toBe("Heiarii");
  });

  it("conserve un prénom composé relié par un tiret", () => {
    expect(publicFirstName("Jean-Baptiste")).toBe("Jean-Baptiste");
  });

  it("ne garde que le premier mot quand deux prénoms sont séparés par un espace", () => {
    expect(publicFirstName("Marie Claire")).toBe("Marie");
  });

  it("ne garde que la première initiale quand le champ mélange initiales et nom", () => {
    expect(publicFirstName("A .KH.BARRO")).toBe("A");
  });

  it("retourne une chaîne vide pour une chaîne vide", () => {
    expect(publicFirstName("")).toBe("");
  });

  it("retourne une chaîne vide pour une valeur nulle ou indéfinie", () => {
    expect(publicFirstName(null)).toBe("");
    expect(publicFirstName(undefined)).toBe("");
  });

  it("nettoie les espaces autour du prénom", () => {
    expect(publicFirstName("  Sophie  ")).toBe("Sophie");
  });
});
