import { describe, it, expect } from "vitest";
import { petNamesPhrase, pickContextTips } from "@/components/dashboard/shared/PetAdviceSection";

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
