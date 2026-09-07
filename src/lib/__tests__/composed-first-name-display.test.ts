import { describe, it, expect } from "vitest";
import { buildPublicSitterProfilePresentation } from "../publicSitterProfilePresentation";

/**
 * Invariant verrouillé : un prénom contenant un espace ou un trait d'union
 * est rendu entier, dans le H1 comme dans le title de la fiche gardien.
 */
describe("prénoms composés sur la fiche publique", () => {
  it.each([
    ["Jean Claude", "Jean Claude"],
    ["Marie Christine", "Marie Christine"],
    ["Anne-Sophie", "Anne-Sophie"],
    ["jean claude", "Jean Claude"],
    ["JEAN CLAUDE", "Jean Claude"],
  ])("rend %s entier dans le H1 et le title", (raw, expected) => {
    const presentation = buildPublicSitterProfilePresentation({
      firstName: raw,
      city: "Brive-la-Gaillarde",
      trustSignals: ["identité vérifiée", "4.9 ★"],
    });
    expect(presentation.h1).toBe(`${expected}, gardien à Brive-la-Gaillarde`);
    expect(presentation.pageTitle).toBe(`${expected}, gardien à Brive-la-Gaillarde`);
  });

  it("garde le repli sur le titre court au-delà de 60 caractères", () => {
    const long = buildPublicSitterProfilePresentation({ firstName: "Jean Claude", city: "Brive-la-Gaillarde", trustSignals: ["identité vérifiée", "4.9 ★"] });
    const short = buildPublicSitterProfilePresentation({ firstName: "Ann", city: "Lyon", trustSignals: ["identité vérifiée", "4.9 ★"] });
    expect(long.pageTitle.length).toBeLessThanOrEqual(60);
    expect(short.pageTitle).toBe("Ann, gardien à Lyon, identité vérifiée · 4.9 ★");
  });
});
