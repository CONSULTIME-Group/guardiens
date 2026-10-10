/**
 * Lot 1, recherche internationale de gardiens (/recherche-gardiens).
 * Vivier complet au delà de 500, compteurs, ville homonyme selon le pays,
 * changement de pays sans résultat et carte, « Tous les pays ».
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcCalls: any[] = [];
let serverRows: any[] = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string, args: any) => {
      rpcCalls.push({ name, args });
      const country = args?.p_country ?? null;
      const rows = serverRows
        .filter((r) => country === null || r.country === country)
        .sort((a, b) => a.user_id.localeCompare(b.user_id));
      const chain: any = {
        order: () => chain,
        // Plafond serveur réel : 1 000 lignes par réponse.
        range: async (from: number, to: number) => ({
          data: rows.slice(from, Math.min(to + 1, from + 1000)),
          error: null,
        }),
      };
      return chain;
    },
    functions: { invoke: vi.fn() },
  },
}));

import {
  fetchSitterSearchPool, applyZone, zoneCounts, changeCountry, selectPlace,
  fromPhoton, fromGeoApiGouv, suggestionSources, computeMapViewport, poolRowToSitter,
} from "@/lib/sitterSearch";

const id = (n: number) => `u-${String(n).padStart(5, "0")}`;
const fr = (n: number, extra: any = {}) => ({ user_id: id(n), country: "FR", postal_code: "69003", latitude_approx: 45.76, longitude_approx: 4.84, ...extra });

beforeEach(() => { rpcCalls.length = 0; serverRows = []; });

describe("vivier complet, plus de tranche de 500", () => {
  it("un gardien Canada classé après le 500e identifiant est bien lu", async () => {
    serverRows = [...Array.from({ length: 1300 }, (_, i) => fr(i)), { user_id: id(1250).replace("u-", "u-z"), country: "CA", latitude_approx: 45.5, longitude_approx: -73.57 }];
    const all = await fetchSitterSearchPool(null);
    expect(all.length).toBe(1301);
    expect(all.some((r) => r.country === "CA")).toBe(true);
    const ca = await fetchSitterSearchPool("CA");
    expect(ca.map((r) => r.country)).toEqual(["CA"]);
    expect(rpcCalls.at(-1)?.args).toEqual({ p_country: "CA" });
  });

  it("pagination sans perte ni doublon au delà de 1 000 lignes", async () => {
    serverRows = Array.from({ length: 2345 }, (_, i) => fr(i));
    const all = await fetchSitterSearchPool("FR");
    expect(all.length).toBe(2345);
    expect(new Set(all.map((r) => r.user_id)).size).toBe(2345);
  });
});

describe("compteurs et zones", () => {
  const center = { lat: 45.76, lng: 4.84 };
  const items = [
    { country: "FR", _dist: 3, profile: { postal_code: "69003" } },
    { country: "FR", _dist: 40, profile: { postal_code: "69100" } },
    { country: "FR", _dist: null, profile: { postal_code: "69200" } },
    { country: "FR", _dist: 300, profile: { postal_code: "75011" } },
    // Code postal étranger qui ressemble à un département français.
    { country: "BR", _dist: 9000, profile: { postal_code: "69000" } },
  ];
  const ctx = { zoneMode: "radius" as const, country: null, center, radiusKm: 15, refDept: "69" };

  it("le compteur d'une zone égale la longueur de la liste de cette zone", () => {
    const c = zoneCounts(items, ctx);
    expect(c.radius).toBe(applyZone(items, ctx).length);
    expect(c.dept).toBe(applyZone(items, { ...ctx, zoneMode: "dept" }).length);
    expect(c.country).toBe(applyZone(items, { ...ctx, zoneMode: "country" }).length);
  });

  it("un code postal étranger ne tombe jamais dans un département français", () => {
    expect(zoneCounts(items, ctx).dept).toBe(3);
    expect(applyZone(items, { ...ctx, radiusKm: 15 }).length).toBe(2);
  });

  it("élargir le rayon garde les premiers résultats (15 puis 50 km)", () => {
    const r15 = applyZone(items, ctx).length;
    const r50 = applyZone(items, { ...ctx, radiusKm: 50 }).length;
    expect(r50).toBeGreaterThanOrEqual(r15);
    expect(r50).toBe(3);
  });

  it("une ligne du vivier garde son pays et des coordonnées approximées", () => {
    const s = poolRowToSitter({ ...fr(1), latitude_approx: 45.76 } as any);
    expect(s.country).toBe("FR");
    expect(s.profile.latitude_approx).toBe(45.76);
  });
});

describe("ville homonyme selon le pays", () => {
  const photon = {
    features: [
      { properties: { name: "Montréal", countrycode: "CA", state: "Québec", country: "Canada", osm_key: "place", osm_value: "city" }, geometry: { coordinates: [-73.57, 45.5] } },
      { properties: { name: "Montréal", countrycode: "FR", state: "Occitanie", country: "France", osm_key: "place", osm_value: "village" }, geometry: { coordinates: [2.14, 43.2] } },
    ],
  };

  it("au Canada, seule la Montréal canadienne est proposée", () => {
    const out = fromPhoton(photon, "CA");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "Montréal", country: "CA", lat: 45.5 });
  });

  it("chaque suggestion porte son pays, France via geo.api.gouv.fr", () => {
    expect(fromGeoApiGouv([{ nom: "Montréal", codesPostaux: ["11290"], centre: { coordinates: [2.14, 43.2] } }])[0].country).toBe("FR");
    expect(suggestionSources("FR")).toEqual({ gouv: true, photon: false });
    expect(suggestionSources("CA")).toEqual({ gouv: false, photon: true });
    expect(suggestionSources(null)).toEqual({ gouv: true, photon: true });
  });

  it("choisir Montréal (Canada) depuis la France passe la recherche au Canada en rayon", () => {
    const s = selectPlace(
      { country: "FR", zoneMode: "dept", city: "Lyon", cityCountry: "FR", cityPostalCode: "69001" },
      fromPhoton(photon, "CA")[0],
    );
    expect(s).toMatchObject({ country: "CA", zoneMode: "radius", city: "Montréal", cityCountry: "CA", cityPostalCode: null });
  });
});

describe("changement de pays et carte", () => {
  const lyon = { country: "FR", zoneMode: "radius" as const, city: "Lyon", cityCountry: "FR", cityPostalCode: "69001" };

  it("Canada retire Lyon et le département, recherche le pays entier", () => {
    expect(changeCountry({ ...lyon, zoneMode: "dept" }, "CA")).toEqual({
      country: "CA", zoneMode: "country", city: "", cityCountry: null, cityPostalCode: null,
    });
  });

  it("pays sans résultat : carte sur fond mondial, cadrée sur ce pays, pas sur la France", () => {
    const vp = computeMapViewport({ country: "CA", center: null, points: [], countryCenter: { lat: 56, lng: -106 } });
    expect(vp.tiles).toBe("world");
    expect(vp.center).toEqual([56, -106]);
  });

  it("France métropolitaine : Plan IGN ; un point outre-mer passe au fond mondial sans être écarté", () => {
    expect(computeMapViewport({ country: "FR", center: { lat: 45.76, lng: 4.84 }, points: [{ lat: 45.7, lng: 4.9 }] }).tiles).toBe("ign");
    const dom = computeMapViewport({ country: "FR", center: null, points: [{ lat: 45.7, lng: 4.9 }, { lat: 16.24, lng: -61.53 }] });
    expect(dom.tiles).toBe("world");
    expect(dom.bounds).toHaveLength(2);
  });

  it("« Tous les pays » lève la restriction et garde une ville cohérente", () => {
    const s = changeCountry(lyon, null);
    expect(s.country).toBeNull();
    expect(s.city).toBe("Lyon");
    expect(changeCountry({ ...lyon, city: "", zoneMode: "country" }, null)).toMatchObject({ country: null, zoneMode: "country" });
    expect(computeMapViewport({ country: null, center: null, points: [] })).toMatchObject({ tiles: "world", zoom: 2 });
  });

  it("le vivier « Tous les pays » est demandé sans pays", async () => {
    serverRows = [fr(1), { user_id: id(2), country: "MX" }];
    const all = await fetchSitterSearchPool(null);
    expect(rpcCalls.at(-1)?.args).toEqual({ p_country: null });
    expect(all.map((r) => r.country).sort()).toEqual(["FR", "MX"]);
  });
});
