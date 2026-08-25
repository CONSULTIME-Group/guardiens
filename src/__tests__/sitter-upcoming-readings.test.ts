import { describe, expect, it } from "vitest";
import { buildUpcomingEditorialItems } from "@/hooks/useRailReadings";

const guard = {
  city: "Annecy",
  pets: [{ id: "pet-1", name: "Rio", species: "dog", breed: "Berger Australien" }],
};

const candidates = [{ species: "dog", breed: "berger australien" }];
const cityGuide = { slug: "annecy", city: "Annecy" };

describe("conseils éditoriaux de la prochaine garde", () => {
  it("privilégie la fiche publiée et le guide de ville existant", () => {
    expect(buildUpcomingEditorialItems(guard, candidates, cityGuide)).toEqual([
      {
        key: "breed",
        title: "La fiche berger australien",
        context: "Pour votre garde avec Rio",
        href: "/races/dog-berger-australien",
      },
      {
        key: "city-guide",
        title: "Annecy, le guide local",
        context: "Pour préparer votre arrivée",
        href: "/guides/annecy",
      },
    ]);
  });

  it("omet la race sans fiche correspondante", () => {
    expect(buildUpcomingEditorialItems(guard, [], cityGuide).map((item) => item.key)).toEqual(["city-guide"]);
  });

  it("omet la ville sans page publiée", () => {
    expect(buildUpcomingEditorialItems(guard, candidates, null).map((item) => item.key)).toEqual(["breed"]);
  });

  it("omet la race non renseignée", () => {
    const withoutBreed = { ...guard, pets: [{ ...guard.pets[0], breed: null }] };
    expect(buildUpcomingEditorialItems(withoutBreed, candidates, cityGuide).map((item) => item.key)).toEqual(["city-guide"]);
  });

  it("retourne vide sans garde à venir pour laisser le repli historique agir", () => {
    expect(buildUpcomingEditorialItems(null, candidates, cityGuide)).toEqual([]);
  });
});