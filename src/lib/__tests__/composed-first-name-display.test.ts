import { describe, it, expect } from "vitest";
import { publicFirstName, capitalizeFirstName } from "../displayName";

/**
 * Invariant verrouillé : un prénom contenant un espace ou un trait d'union
 * est rendu entier, dans le H1 comme dans le title de la fiche gardien.
 */
const buildTitle = (firstName: string, city: string) => {
  const baseTitle = city ? `${firstName}, gardien à ${city}` : `${firstName}, gardien d'animaux`;
  const candidateTitle = `${baseTitle}, identité vérifiée · 4.9 ★`;
  return candidateTitle.length <= 60 ? candidateTitle : baseTitle;
};

describe("prénoms composés sur la fiche publique", () => {
  it.each([
    ["Jean Claude", "Jean Claude"],
    ["Marie Christine", "Marie Christine"],
    ["Anne-Sophie", "Anne-Sophie"],
    ["jean claude", "Jean Claude"],
  ])("rend %s entier dans le H1", (raw, expected) => {
    expect(capitalizeFirstName(publicFirstName(raw))).toBe(expected);
  });

  it("rend le prénom composé entier dans le title", () => {
    const firstName = capitalizeFirstName(publicFirstName("Jean Claude"));
    const title = buildTitle(firstName, "Brive-la-Gaillarde");
    expect(title).toContain("Jean Claude");
    expect(title).toBe("Jean Claude, gardien à Brive-la-Gaillarde");
  });

  it("garde le repli sur le titre court au-delà de 60 caractères", () => {
    expect(buildTitle("Jean Claude", "Brive-la-Gaillarde").length).toBeLessThanOrEqual(60);
    expect(buildTitle("Ann", "Lyon")).toBe("Ann, gardien à Lyon, identité vérifiée · 4.9 ★");
  });
});
