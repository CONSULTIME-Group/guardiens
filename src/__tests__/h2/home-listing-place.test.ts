import { describe, expect, it } from "vitest";
import { homeCityDisplay, homeListingPlace } from "@/lib/homeListingPlace";

describe("lieu des cartes de l'accueil (lot H2)", () => {
  it("commune puis département pour une garde en France", () => {
    expect(homeListingPlace({ city: "Bazolles", departementCode: "58", country: "FR" })).toBe("Bazolles, Nièvre");
    expect(homeListingPlace({ city: "Collonges-sous-Salève", departementCode: "74", country: "FR" })).toBe("Collonges-sous-Salève, Haute-Savoie");
  });

  it("remet une commune en capitales ou en minuscule dans sa forme lisible", () => {
    expect(homeListingPlace({ city: "VIALAS", departementCode: "48", country: "FR" })).toBe("Vialas, Lozère");
    expect(homeListingPlace({ city: "les Issambres", departementCode: "83", country: "FR" })).toBe("Les Issambres, Var");
    expect(homeCityDisplay("SAINT-ÉTIENNE")).toBe("Saint-Étienne");
  });

  it("outre-mer : le territoire, jamais « Outre-mer »", () => {
    expect(homeListingPlace({ city: "Punaauia", departementCode: "987", country: "PF" })).toBe("Punaauia, Polynésie française");
    expect(homeListingPlace({ city: "Saint-Pierre", departementCode: "974", country: "FR" })).toBe("Saint-Pierre, La Réunion");
  });

  it("hors de France : le pays, sans le répéter s'il figure déjà dans la commune", () => {
    expect(homeListingPlace({ city: "Saint Ludger, Québec, Canada", country: "CA" })).toBe("Saint Ludger, Québec, Canada");
    expect(homeListingPlace({ city: "Hannut", country: "BE" })).toBe("Hannut, Belgique");
  });

  it("besoin : département déduit du code postal", () => {
    expect(homeListingPlace({ city: "Lyon", postalCode: "69005" })).toBe("Lyon, Rhône");
    expect(homeListingPlace({ city: "Ajaccio", postalCode: "20000" })).toBe("Ajaccio, Corse-du-Sud");
  });

  it("commune absente : le département seul ; rien de connu : chaîne vide", () => {
    expect(homeListingPlace({ city: null, departementCode: "69", country: "FR" })).toBe("Rhône");
    expect(homeListingPlace({ city: "Champlemy", departementCode: null, country: "FR" })).toBe("Champlemy");
    expect(homeListingPlace({})).toBe("");
  });
});
