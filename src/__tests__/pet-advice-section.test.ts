import { describe, it, expect } from "vitest";
import {
  petNamesPhrase,
  pickContextTips,
  type PetAdviceContext,
} from "@/components/dashboard/shared/PetAdviceSection";

describe("petNamesPhrase", () => {
  it("nomme un seul compagnon", () => {
    expect(petNamesPhrase([{ id: "1", name: "Rex", species: "dog", breed: null }])).toBe("Rex");
  });
  it("relie deux compagnons par et", () => {
    expect(
      petNamesPhrase([
        { id: "1", name: "Rex", species: "dog", breed: null },
        { id: "2", name: "Resa", species: "cat", breed: null },
      ]),
    ).toBe("Rex et Resa");
  });
  it("plafonne à trois prénoms", () => {
    const pets = ["A", "B", "C", "D"].map((n, i) => ({ id: String(i), name: n, species: "dog", breed: null }));
    expect(petNamesPhrase(pets)).toBe("A, B et C");
  });
  it("reste lisible sans animal", () => {
    expect(petNamesPhrase([])).toBe("vos compagnons");
  });
});

describe("pickContextTips", () => {
  it("priorise la situation réelle, deux conseils au plus", () => {
    const tips = pickContextTips(
      { hasUpcomingSit: true, hasDraftSit: true, profileIncomplete: true },
      7,
    );
    expect(tips.map((t) => t.key)).toEqual(["upcoming", "draft"]);
  });
  it("complète par la saison quand la situation est calme", () => {
    expect(pickContextTips({}, 7).map((t) => t.key)).toEqual(["summer"]);
    expect(pickContextTips({}, 1).map((t) => t.key)).toEqual(["winter"]);
    expect(pickContextTips({ hasDraftSit: true }, 4).map((t) => t.key)).toEqual([
      "draft",
      "midseason",
    ]);
  });
});

/**
 * Garde-fou destinations : une carte de conseil ne doit jamais mener vers une
 * page sans rapport avec son intitulé. /guides est le hub des guides de
 * villes : aucun conseil « profil », « saison », « annonce » ou « avant la
 * garde » n'y a sa place. Si une destination pertinente n'existe pas, la
 * carte ne doit pas être cliquable (règle produit du 20/08/2026).
 */
describe("pickContextTips — destinations cohérentes", () => {
  const ALL_CONTEXTS: PetAdviceContext[] = [
    {},
    { hasUpcomingSit: true },
    { hasDraftSit: true },
    { profileIncomplete: true },
    { hasUpcomingSit: true, hasDraftSit: true, profileIncomplete: true },
  ];
  const ALL_MONTHS = [1, 4, 7, 10, 12];

  it("aucune carte ne mène aux guides de villes", () => {
    for (const ctx of ALL_CONTEXTS) {
      for (const month of ALL_MONTHS) {
        for (const tip of pickContextTips(ctx, month)) {
          expect(tip.to.startsWith("/guides")).toBe(false);
        }
      }
    }
  });

  it("chaque conseil pointe vers une destination en rapport avec son intitulé", () => {
    const expected: Record<string, RegExp> = {
      upcoming: /^\/actualites\/preparer-maison-avant-garde$/,
      draft: /^\/actualites\/rediger-bonne-annonce-house-sitting$/,
      profile: /^\/owner-profile\?section=identity$/,
      summer: /^\/conseils#saison$/,
      winter: /^\/conseils#saison$/,
      midseason: /^\/conseils#saison$/,
    };
    const seen = new Set<string>();
    for (const ctx of ALL_CONTEXTS) {
      for (const month of ALL_MONTHS) {
        for (const tip of pickContextTips(ctx, month)) {
          seen.add(tip.key);
          expect(expected[tip.key], `destination inconnue pour ${tip.key}`).toBeDefined();
          expect(tip.to).toMatch(expected[tip.key]);
        }
      }
    }
    // Les six variantes doivent toutes être atteignables par la matrice.
    expect([...seen].sort()).toEqual(
      ["draft", "midseason", "profile", "summer", "upcoming", "winter"].sort(),
    );
  });
});
