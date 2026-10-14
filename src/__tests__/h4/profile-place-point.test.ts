/**
 * Lot H4 : une annonce située par le profil de son propriétaire n'appelle
 * aucun géocodage ; seules les annonces sans coordonnées de profil y passent.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { profilePlacePoint } from "@/lib/sitPlacePoint";

const owner = (extra: Record<string, unknown> = {}) => ({
  city: "Vialas", country: "FR", departement_code: "48", postal_code: "48220",
  latitude_approx: 44.33, longitude_approx: 3.91, ...extra,
});

describe("point d'une annonce tiré du profil (lot H4)", () => {
  it("lieu du profil avec coordonnées : point du profil", () => {
    expect(profilePlacePoint({ city: "Autre", country: "FR", owner: owner() })).toEqual({ lat: 44.33, lng: 3.91 });
  });

  it("profil sans coordonnées : null, le géocodage prend le relais", () => {
    expect(profilePlacePoint({ city: "Vialas", country: "FR", owner: owner({ latitude_approx: null, longitude_approx: null }) })).toBeNull();
  });

  it("lieu tiré de l'annonce (profil sans commune) : jamais le point du profil", () => {
    expect(profilePlacePoint({ city: "Lyon", country: "FR", owner: owner({ city: null }) })).toBeNull();
  });

  it("coordonnées nulles ou invalides : null", () => {
    expect(profilePlacePoint({ owner: owner({ latitude_approx: 0, longitude_approx: 0 }) })).toBeNull();
    expect(profilePlacePoint({ owner: owner({ latitude_approx: "x" }) })).toBeNull();
  });

  it("SearchSitter lit les coordonnées du profil et ne géocode qu'avec un point de recherche", () => {
    const src = readFileSync("src/components/search/SearchSitter.tsx", "utf8");
    expect(src).toContain("latitude_approx, longitude_approx");
    expect(src).toMatch(/await locateSitPlaces\(items, !!searchCoords\)/);
    expect(src).toMatch(/const point = profilePlacePoint\(s\);/);
  });
});
