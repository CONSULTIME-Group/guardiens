import { describe, it, expect } from "vitest";
import {
  normalizeTravelZones, travelZonesSummary, destinationTokens, canComeTo, continentOf,
} from "@/lib/travelZones";
import { poolRowToSitter } from "@/lib/sitterSearch";

const lyon = { latitude_approx: 45.76, longitude_approx: 4.84 };
const fr = (zones: string[] | null, extra: any = {}) => ({ country: "FR", travel_zones: zones, geographic_radius: 50, profile: lyon, ...extra });
const montreal = { lat: 45.5, lng: -73.57 };

describe("lot 2, mobilité géographique", () => {
  it("roundtrip : normalisation stable, ordre et casse ISO", () => {
    const z = normalizeTravelZones(["Country:ca", "world", "local", "continent:na", "world"]);
    expect(z).toEqual(["continent:NA", "country:CA", "local", "world"]);
    expect(normalizeTravelZones(z)).toEqual(z);
  });

  it("valeurs anciennes : null ou vide = non renseignée, jamais mobile", () => {
    expect(normalizeTravelZones(null)).toBeNull();
    expect(normalizeTravelZones([])).toBeNull();
    expect(normalizeTravelZones(["n'importe quoi", "region:FR-XYZ"])).toBeNull();
    expect(travelZonesSummary(null)).toBe("Mobilité non renseignée");
    expect(canComeTo(fr(null), { country: "CA" })).toBe(false);
  });

  it("France vers Canada via pays, continent ou monde", () => {
    expect(continentOf("CA")).toBe("NA");
    const dest = { country: "CA", center: montreal };
    expect(destinationTokens(dest)).toEqual(expect.arrayContaining(["world", "country:CA", "continent:NA"]));
    expect(canComeTo(fr(["country:CA"]), dest)).toBe(true);
    expect(canComeTo(fr(["continent:NA"]), dest)).toBe(true);
    expect(canComeTo(fr(["world"]), dest)).toBe(true);
    expect(canComeTo(fr(["continent:SA", "country:FR"]), dest)).toBe(false);
  });

  it("rayon local : hors zone exclu, dans le rayon retenu", () => {
    const lyonDest = { country: "FR", center: { lat: 45.76, lng: 4.84 } };
    const parisDest = { country: "FR", center: { lat: 48.86, lng: 2.35 } };
    expect(canComeTo(fr(["local"]), lyonDest)).toBe(true);
    expect(canComeTo(fr(["local"]), parisDest)).toBe(false);
    // Une zone région couvre la destination même hors rayon.
    expect(canComeTo(fr(["local", "region:FR-IDF"]), { ...parisDest, regionFr: "IDF" })).toBe(true);
  });

  it("le vivier mobile transmet zones et rayon aux cartes", () => {
    const s = poolRowToSitter({ user_id: "u", country: "FR", travel_zones: ["world"], geographic_radius: 20 } as any);
    expect(s.travel_zones).toEqual(["world"]);
    expect(s.geographic_radius).toBe(20);
  });

  it("résidents sans mobilité déclarée : jamais « peuvent venir ici »", () => {
    const ca = (z: string[] | null) => ({ country: "CA", travel_zones: z, geographic_radius: 50, profile: { latitude_approx: 45.5, longitude_approx: -73.57 } });
    expect(canComeTo(ca(null), { country: "CA" })).toBe(false);
    expect(canComeTo(ca([]), { country: "CA" })).toBe(false);
    expect(canComeTo(ca(null), { country: "CA", center: montreal })).toBe(false);
    // local seul : pas de pays entier sans ville
    expect(canComeTo(ca(["local"]), { country: "CA" })).toBe(false);
    expect(canComeTo(ca(["local"]), { country: "CA", center: montreal })).toBe(true);
    expect(canComeTo(ca(["local"]), { country: "CA", center: { lat: 49.28, lng: -123.12 } })).toBe(false);
    expect(canComeTo(ca(["country:CA"]), { country: "CA" })).toBe(true);
    expect(canComeTo(ca(["world"]), { country: "BR" })).toBe(true);
    expect(canComeTo(ca(["continent:NA"]), { country: "BR" })).toBe(false);
    expect(canComeTo(ca(["country:CA"]), { country: "BR" })).toBe(false);
  });
});
