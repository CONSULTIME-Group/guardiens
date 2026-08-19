import { describe, expect, it } from "vitest";
import { rankSitterListings } from "../sitterListingRank";

const listing = (id: string, lat: number | null, affinityScore: number, department = "69") => ({
  id,
  department,
  coords: lat == null ? null : { lat, lng: 4.84 },
  affinityScore,
  environments: [] as string[],
});

describe("rankSitterListings", () => {
  it("place trois gardes de la zone d'une alerte à 100 km en premier", () => {
    const result = rankSitterListings({
      listings: [listing("hors-zone", 48, 99), listing("zone-3", 46.4, 40), listing("zone-1", 45.8, 70), listing("zone-2", 46.1, 60)],
      alert: { zoneType: "rayon", radiusKm: 100, department: null, center: { lat: 45.76, lng: 4.84 } },
      sitterCoords: { lat: 45.76, lng: 4.84 },
      preferredEnvironments: [],
    });
    expect(result.source).toBe("alert");
    expect(result.listings.map((item) => item.id)).toEqual(["zone-1", "zone-2", "zone-3"]);
  });

  it("classe les trois plus proches sans alerte", () => {
    const result = rankSitterListings({
      listings: [listing("loin", 48, 99), listing("proche", 45.8, 20), listing("milieu", 46.1, 70), listing("troisieme", 46.4, 60)],
      alert: null,
      sitterCoords: { lat: 45.76, lng: 4.84 },
      preferredEnvironments: [],
    });
    expect(result.source).toBe("distance");
    expect(result.listings.map((item) => item.id)).toEqual(["proche", "milieu", "troisieme"]);
  });

  it("classe trois gardes par affinité sans coordonnées", () => {
    const result = rankSitterListings({
      listings: [listing("a", null, 40), listing("b", null, 90), listing("c", null, 65), listing("d", null, 80)],
      alert: null,
      sitterCoords: null,
      preferredEnvironments: [],
    });
    expect(result.source).toBe("affinity");
    expect(result.listings.map((item) => item.id)).toEqual(["b", "d", "c"]);
  });

  it("utilise l'environnement uniquement pour départager une pertinence égale", () => {
    const preferred = listing("preferred", null, 70);
    preferred.environments = ["foret"];
    const result = rankSitterListings({
      listings: [listing("neutral", null, 70), preferred],
      alert: null,
      sitterCoords: null,
      preferredEnvironments: ["foret"],
    });
    expect(result.listings[0].id).toBe("preferred");
  });
});