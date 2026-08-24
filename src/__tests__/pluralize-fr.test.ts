import { describe, it, expect } from "vitest";
import { countLabel, pluralizeWord } from "@/lib/pluralizeFr";

/**
 * Garde-fou du 24/08/2026 : la page département affichait « 1 ville
 * couvertes » et « 1 guides locaux ». Le nom s'accordait, pas l'adjectif.
 */
describe("countLabel, accord en nombre", () => {
  it("accorde nom et adjectif au singulier pour 0 et 1", () => {
    expect(countLabel(0, "ville couverte")).toBe("0 ville couverte");
    expect(countLabel(1, "ville couverte")).toBe("1 ville couverte");
  });

  it("accorde nom et adjectif au pluriel au delà de 1", () => {
    expect(countLabel(7, "ville couverte")).toBe("7 villes couvertes");
  });

  it("pluralise les mots en al par aux", () => {
    expect(countLabel(1, "guide local")).toBe("1 guide local");
    expect(countLabel(2, "guide local")).toBe("2 guides locaux");
  });

  it("laisse invariables les mots terminés par s, x ou z", () => {
    expect(pluralizeWord("bras", 3)).toBe("bras");
    expect(pluralizeWord("prix", 3)).toBe("prix");
    expect(pluralizeWord("nez", 3)).toBe("nez");
  });
});
