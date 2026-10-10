import { describe, it, expect } from "vitest";
import { ratingSummary, cardQuote, cardAnimals, cardSkillGroups, cardPlaceFacts, sitHasPhotos } from "@/lib/cardFacts";
import { RESPONSIVENESS_ABSENT_NOTE, RESPONSIVENESS_SCOPE_NOTE } from "@/lib/profileSignals";

describe("L4 faits de carte", () => {
  it("7 avis et 4 gardes : note sur les avis, gardes à part", () => {
    expect(ratingSummary(4.86, 7, 4)).toBe("4,9/5 sur 7 avis · 4 gardes réalisées");
    expect(ratingSummary(null, 0, 0)).toBeNull();
    expect(ratingSummary(5, 0, 2)).toBe("2 gardes réalisées");
  });
  it("bio longue : citation coupée sur un mot, jamais vide", () => {
    const long = "J'adore les animaux et je garde des maisons depuis des années dans toute la région avec beaucoup de plaisir et de soin pour chacun";
    const q = cardQuote(long, 60)!;
    expect(q.endsWith("…")).toBe(true);
    expect(q.length).toBeLessThanOrEqual(61);
    expect(long.startsWith(q.slice(0, -1))).toBe(true);
    expect(cardQuote("Bonjour. Suite", 120)).toBe("Bonjour.");
    expect(cardQuote("  ")).toBeNull();
  });
  it("animaux normalisés et dédoublonnés", () => {
    expect(cardAnimals(["dog", "Chiens", "cat"])).toEqual(["Chiens", "Chats"]);
  });
  it("au plus 2 savoir-faire réels", () => {
    expect(cardSkillGroups({ competences: [] }).length).toBe(0);
    expect(cardSkillGroups({ animalTypes: ["Chiens", "Chats"], competences: ["Tonte et entretien jardin"] }).length).toBeLessThanOrEqual(2);
  });
  it("pays hors France et mobilité déclarée seulement", () => {
    expect(cardPlaceFacts("CA", null)).toEqual({ countryLabel: "Canada", mobility: null });
    expect(cardPlaceFacts("FR", ["world"]).countryLabel).toBeNull();
    expect(cardPlaceFacts("FR", ["world"]).mobility).toContain("monde");
  });
  it("photos d'annonce : couverture, logement ou galerie", () => {
    expect(sitHasPhotos({ cover_photo_url: "x" })).toBe(true);
    expect(sitHasPhotos({ property: { photos: [] }, ownerGalleryFirstPhoto: "g" })).toBe(true);
    expect(sitHasPhotos({ property: { photos: [] } })).toBe(false);
  });
  it("textes de réactivité neutres et exacts", () => {
    expect(RESPONSIVENESS_ABSENT_NOTE).toBe("Délai de réponse indisponible.");
    expect(RESPONSIVENESS_SCOPE_NOTE).toContain("90 derniers jours");
    expect(RESPONSIVENESS_SCOPE_NOTE).toContain("5 contacts");
  });
});
