import { describe, it, expect } from "vitest";
import {
  pickMissingOpportunities,
  missingOpportunitySentence,
  MISSING_OPPORTUNITIES_MAX,
  type MissingOpportunitiesStats,
} from "../missingOpportunities";

const stats = (items: MissingOpportunitiesStats["items"], total = 11): MissingOpportunitiesStats => ({
  total_sits: total,
  items,
});

describe("missingOpportunitySentence", () => {
  it("formule la doctrine : « 8 des 11 annonces en ligne demandent un gardien véhiculé, vous n'avez pas répondu. »", () => {
    expect(missingOpportunitySentence("vehicle", 8, 11)).toBe(
      "8 des 11 annonces en ligne demandent un gardien véhiculé, vous n'avez pas répondu.",
    );
  });

  it("accorde au singulier quand une seule annonce est concernée", () => {
    expect(missingOpportunitySentence("species", 1, 11)).toBe(
      "Une des 11 annonces en ligne précise les animaux confiés, vous n'avez pas répondu.",
    );
  });

  it("gère le cas d'une seule annonce en ligne", () => {
    expect(missingOpportunitySentence("vehicle", 1, 1)).toBe(
      "L'annonce en ligne demande un gardien véhiculé, vous n'avez pas répondu.",
    );
  });

  it("renvoie une chaîne vide sans annonce concernée", () => {
    expect(missingOpportunitySentence("vehicle", 0, 11)).toBe("");
    expect(missingOpportunitySentence("vehicle", 3, 0)).toBe("");
  });
});

describe("pickMissingOpportunities", () => {
  it("ne retient que les questions sans réponse concernant au moins une annonce", () => {
    const result = pickMissingOpportunities(
      stats([
        { key: "vehicle", concerned: 8, answered: false },
        { key: "species", concerned: 9, answered: true },
        { key: "work", concerned: 5, answered: false },
        { key: "languages", concerned: 0, answered: false },
      ]),
    );
    expect(result.map((r) => r.key)).toEqual(["vehicle", "work"]);
  });

  it("n'affiche jamais plus de deux manques, triés par annonces concernées", () => {
    const result = pickMissingOpportunities(
      stats([
        { key: "languages", concerned: 2, answered: false },
        { key: "vehicle", concerned: 8, answered: false },
        { key: "species", concerned: 9, answered: false },
        { key: "work", concerned: 5, answered: false },
      ]),
    );
    expect(result).toHaveLength(MISSING_OPPORTUNITIES_MAX);
    expect(result.map((r) => r.key)).toEqual(["species", "vehicle"]);
  });

  it("départage à compteur égal selon l'ordre fixe véhicule > espèces > présence", () => {
    const result = pickMissingOpportunities(
      stats([
        { key: "work", concerned: 4, answered: false },
        { key: "vehicle", concerned: 4, answered: false },
        { key: "species", concerned: 4, answered: false },
      ]),
    );
    expect(result.map((r) => r.key)).toEqual(["vehicle", "species"]);
  });

  it("disparaît quand tout est répondu ou sans annonce en ligne", () => {
    expect(
      pickMissingOpportunities(stats([{ key: "vehicle", concerned: 8, answered: true }])),
    ).toEqual([]);
    expect(
      pickMissingOpportunities(stats([{ key: "vehicle", concerned: 8, answered: false }], 0)),
    ).toEqual([]);
    expect(pickMissingOpportunities(null)).toEqual([]);
  });

  it("chaque manque pointe vers la section du profil qui pose la question", () => {
    const result = pickMissingOpportunities(
      stats([
        { key: "vehicle", concerned: 8, answered: false },
        { key: "species", concerned: 9, answered: false },
      ]),
    );
    expect(result.find((r) => r.key === "vehicle")?.href).toBe("/sitter-profile?section=mobility");
    expect(result.find((r) => r.key === "species")?.href).toBe("/sitter-profile?section=experience");
  });
});
