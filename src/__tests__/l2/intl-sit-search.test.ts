import { describe, it, expect } from "vitest";
import { filterIntl, intlCountryCounts, applyIntlRadius, uniquePlaceKeys, intlPlaceLabel, intlTitle, closestSortAvailable } from "@/lib/intlSitSearch";
import { resolveSitPlace } from "@/lib/sitSearchRules";

const mk = (id: string, city: string | null, country: string | null, extra: any = {}) => ({
  id, start_date: "2026-11-01", end_date: "2026-11-20", species: ["dog"],
  place: { city, country, dept: null, source: "owner" as const }, ...extra,
});

describe("L2 moteur international", () => {
  const items = [mk("a", "Saint-Ludger", "CA"), mk("b", "Taravao", "PF"), mk("c", "Punaauia", "PF", { species: ["cat"] })];

  it("compte par pays avec noms complets", () => {
    expect(intlCountryCounts(items)).toEqual([
      { code: "PF", name: "Polynésie française", count: 2 },
      { code: "CA", name: "Canada", count: 1 },
    ]);
  });
  it("Tous les pays ne restreint rien, un pays filtre strictement", () => {
    const f = { start: null, end: null, species: [] };
    expect(filterIntl(items, { country: null, ...f })).toHaveLength(3);
    expect(filterIntl(items, { country: "CA", ...f }).map((s) => s.id)).toEqual(["a"]);
    expect(filterIntl(items, { country: "MX", ...f })).toHaveLength(0);
  });
  it("dates chevauchantes et animaux (au moins une espèce)", () => {
    expect(filterIntl(items, { country: null, start: "2026-11-21", end: null, species: [] })).toHaveLength(0);
    expect(filterIntl(items, { country: null, start: null, end: "2026-11-05", species: [] })).toHaveLength(3);
    expect(filterIntl(items, { country: null, start: null, end: null, species: ["cat"] }).map((s) => s.id)).toEqual(["c"]);
  });
  it("rayon strict : sans point, ni inclusion ni distance", () => {
    const pts: Record<string, any> = { a: { lat: 45.65, lng: -72.48 } };
    const r = applyIntlRadius(items, { lat: 45.5, lng: -73.57 }, 100, (s) => pts[s.id] ?? null);
    expect(r.items.map((s) => s.id)).toEqual(["a"]);
    expect(r.unlocated).toBe(2);
    const far = applyIntlRadius(items, { lat: 45.5, lng: -73.57 }, 25, (s) => pts[s.id] ?? null);
    expect(far.items).toHaveLength(0);
  });
  it("géocodage dédupliqué par lieu, jamais par annonce", () => {
    expect(uniquePlaceKeys([...items, mk("d", "taravao", "PF")])).toHaveLength(3);
  });
  it("libellés et titres sans code brut", () => {
    expect(intlPlaceLabel({ city: "Saint-Ludger", country: "CA" })).toBe("Saint-Ludger, Canada");
    expect(intlTitle("PF", null)).toBe("Gardes à l'étranger : Polynésie française");
    expect(intlTitle(null, null)).toBe("Gardes à l'étranger, tous les pays hors France");
    expect(intlTitle(null, null, true)).toBe("Gardes dans tous les pays, France incluse");
    expect(closestSortAvailable(null)).toBe(false);
  });
  it("lieu propriétaire prioritaire, aucun FR déduit", () => {
    expect(resolveSitPlace({ city: "Paris", country: "FR", owner: { city: "Montréal", country: "CA" } }).country).toBe("CA");
    expect(resolveSitPlace({ city: "X", country: null, owner: null }).country).toBeNull();
  });
});

import { geocodeIntlPlace } from "@/lib/intlSitSearch";
describe("L2 géocodage hors France", () => {
  const photon = { features: [
    { properties: { name: "Saint-Ludger", countrycode: "CA", osm_key: "place", osm_value: "village", state: "Québec", country: "Canada" }, geometry: { coordinates: [-70.69123, 45.75456] } },
    { properties: { name: "Saint-Ludger", countrycode: "FR", osm_key: "place", osm_value: "village" }, geometry: { coordinates: [1, 1] } },
  ] };
  const f = (async () => ({ ok: true, json: async () => photon })) as any;
  it("repli Photon : pays et nom exacts, point arrondi", async () => {
    expect(await geocodeIntlPlace("Saint Ludger", "CA", async () => null, f)).toEqual({ lat: 45.755, lng: -70.691 });
  });
  it("aucun point si le nom ne correspond pas", async () => {
    expect(await geocodeIntlPlace("Montréal", "CA", async () => null, f)).toBeNull();
  });
  it("le géocodeur du site reste prioritaire", async () => {
    expect(await geocodeIntlPlace("X", "CA", async () => ({ lat: 1, lng: 2 }), f)).toEqual({ lat: 1, lng: 2 });
  });
});

import { pickUniquePlace, parseUrlPoint, carryOverParams, __resetIntlPointCache } from "@/lib/intlSitSearch";
describe("L2 revue root", () => {
  const m = (lat: number, lng: number, detail: string) => ({ name: "Springfield", detail, country: "US", postalCode: null, lat, lng });
  it("homonymes distincts sans région : aucun point", () => {
    expect(pickUniquePlace([m(39.8, -89.6, "Illinois, États-Unis"), m(42.1, -72.6, "Massachusetts, États-Unis")], null)).toBeNull();
  });
  it("la région lève l'ambiguïté", () => {
    expect(pickUniquePlace([m(39.8, -89.6, "Illinois, États-Unis"), m(42.1, -72.6, "Massachusetts, États-Unis")], "Massachusetts")).toEqual({ lat: 42.1, lng: -72.6 });
  });
  it("nom « Saint Ludger, Québec, Canada » : région utilisée, une seule requête par lieu", async () => {
    __resetIntlPointCache();
    let calls = 0;
    const photon = { features: [
      { properties: { name: "Saint-Ludger", countrycode: "CA", osm_key: "place", osm_value: "village", state: "Québec", country: "Canada" }, geometry: { coordinates: [-70.69, 45.75] } },
      { properties: { name: "Saint-Ludger", countrycode: "CA", osm_key: "place", osm_value: "village", state: "Nouveau-Brunswick", country: "Canada" }, geometry: { coordinates: [-66.0, 47.0] } },
    ] };
    const f = (async () => { calls++; return { ok: true, json: async () => photon }; }) as any;
    expect(await geocodeIntlPlace("Saint Ludger, Québec, Canada", "CA", async () => null, f)).toEqual({ lat: 45.75, lng: -70.69 });
    expect(await geocodeIntlPlace("Saint Ludger, Québec, Canada", "CA", async () => null, f)).toEqual({ lat: 45.75, lng: -70.69 });
    __resetIntlPointCache();
    expect(await geocodeIntlPlace("Saint Ludger", "CA", async () => null, f)).toBeNull();
    __resetIntlPointCache();
    expect(await geocodeIntlPlace("Saint Ludger", "CA", async () => null, f)).toBeNull();
    expect(calls).toBe(3);
  });
  it("échec mis en cache : pas de nouvelle requête", async () => {
    __resetIntlPointCache();
    let calls = 0;
    const f = (async () => { calls++; return { ok: false }; }) as any;
    await geocodeIntlPlace("Nulle", "CA", async () => null, f);
    await geocodeIntlPlace("Nulle", "CA", async () => null, f);
    expect(calls).toBe(1);
  });
  it("coordonnées d'adresse validées", () => {
    expect(parseUrlPoint("45.5", "-73.6")).toEqual({ lat: 45.5, lng: -73.6 });
    expect(parseUrlPoint("91", "0")).toBeNull();
    expect(parseUrlPoint("0", "181")).toBeNull();
    expect(parseUrlPoint("abc", "1")).toBeNull();
    expect(parseUrlPoint("", "1")).toBeNull();
    expect(parseUrlPoint(null, "1")).toBeNull();
  });
  it("changement de pays : dates et animaux compatibles gardés, ville et zone effacées", () => {
    const from = new URLSearchParams({ ville: "Lyon", rayon: "30", zone: "dept", debut: "2026-11-01", fin: "2026-11-30", animaux: "Chiens,Reptiles" });
    expect(carryOverParams(from, "intl").toString()).toBe("debut=2026-11-01&fin=2026-11-30&animaux=Chiens%2CReptiles");
    expect(carryOverParams(from, "france").toString()).toBe("debut=2026-11-01&fin=2026-11-30&animaux=Chiens");
  });
});
