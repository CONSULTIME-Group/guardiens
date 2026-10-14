/**
 * Lots GL1 et GL2 (13/10/2026) : guides locaux ancrés sur le vrai lieu, lieux
 * réels et sourcés.
 * Constat : le 10/10/2026, /guides/saint-ludger (Québec) publiait 20 lieux
 * écrits par l'IA et situés en France (76000, vétérinaires dans l'Oise).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORIES,
  CATEGORY_RULES,
  baseSlug,
  buildOverpassQuery,
  categorize,
  collectPlaces,
  describe as describePlace,
  directionsUrl,
  formatDistance,
  googlePlaceUrl,
  homonymSlug,
  introPrompt,
  matchGooglePlaceId,
  pickNearest,
  resolveGuideCenter,
  selectByCategory,
  stripDashes,
  toCandidates,
  usesBan,
  type Candidate,
  type OsmElement,
  type PlaceKind,
  displayName,
  categoriesToWiden,
  withinGuide,
  compactElements,
} from "../../../supabase/functions/_shared/guide-places/source";

const SAINT_LUDGER = { lat: 45.742131, lon: -70.694618, country: "CA", region: "Québec" };
const noSleep = async () => {};

const el = (id: number, tags: Record<string, string>, lat: number, lon: number, type = "node"): OsmElement => ({
  type,
  id,
  lat,
  lon,
  tags,
});

/** Décale un point d'environ `km` vers le nord. */
const north = (km: number) => SAINT_LUDGER.lat + km / 111.2;

function fakeFetch(routes: {
  overpass?: (query: string) => OsmElement[] | null;
  ban?: (url: string) => unknown;
  nominatim?: (url: string) => unknown;
}) {
  const calls: string[] = [];
  const fn = async (url: string, init?: RequestInit) => {
    calls.push(url);
    if (url.includes("overpass")) {
      const q = init?.body
        ? decodeURIComponent(String(init.body).replace(/^data=/, ""))
        : new URL(url).searchParams.get("data") ?? "";
      const els = routes.overpass?.(q);
      if (els === null) return new Response("busy", { status: 429 });
      return new Response(JSON.stringify({ elements: els ?? [] }), { status: 200 });
    }
    if (url.includes("api-adresse.data.gouv.fr")) {
      return new Response(JSON.stringify(routes.ban?.(url) ?? { features: [] }), { status: 200 });
    }
    if (url.includes("nominatim")) {
      return new Response(JSON.stringify(routes.nominatim?.(url) ?? []), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };
  return { fn, calls };
}

describe("GL2, catégories OpenStreetMap", () => {
  it("range chaque élément nommé dans sa catégorie", () => {
    expect(categorize(el(1, { amenity: "veterinary", name: "Clinique" }, 0, 0))?.category).toBe("vet");
    expect(categorize(el(2, { shop: "pet", name: "Animalerie" }, 0, 0))?.category).toBe("pet_shop");
    expect(categorize(el(3, { leisure: "dog_park", name: "Parc canin" }, 0, 0))?.category).toBe("dog_park");
    expect(categorize(el(4, { landuse: "forest", name: "Forêt de la Rivière" }, 0, 0))).toEqual({ category: "general_park", kind: "forest" });
    expect(categorize(el(5, { leisure: "park", name: "Parc municipal" }, 0, 0))?.kind).toBe("park");
    expect(categorize(el(6, { route: "hiking", name: "Sentier du lac", network: "lwn" }, 0, 0))?.category).toBe("walk_trail");
    expect(categorize(el(7, { highway: "path", name: "Sentier des Cascades" }, 0, 0))?.kind).toBe("path");
    expect(categorize(el(8, { amenity: "cafe", name: "Café du coin", dog: "yes" }, 0, 0))?.category).toBe("dog_friendly_cafe");
  });

  it("écarte les éléments sans nom, les grands itinéraires et les cafés sans mention des chiens", () => {
    expect(categorize(el(9, { amenity: "veterinary" }, 0, 0))).toBeNull();
    expect(categorize(el(10, { route: "hiking", name: "GR 5", network: "iwn" }, 0, 0))).toBeNull();
    expect(categorize(el(11, { amenity: "cafe", name: "Café" }, 0, 0))).toBeNull();
    expect(categorize(el(12, { highway: "residential", name: "Rue du Sentier" }, 0, 0))).toBeNull();
  });

  it("la requête Overpass vise le centre réel et les seules catégories demandées", () => {
    const q = buildOverpassQuery(["vet", "pet_shop"], 15000, SAINT_LUDGER.lat, SAINT_LUDGER.lon);
    expect(q).toContain(`around:15000,${SAINT_LUDGER.lat},${SAINT_LUDGER.lon}`);
    expect(q).toContain(`"amenity"="veterinary"`);
    expect(q).toContain(`"shop"="pet"`);
    expect(q).not.toContain("forest");
  });

  it("rejette un lieu hors rayon : un vétérinaire de l'Oise n'entre pas dans un guide du Québec", () => {
    const creil = el(20, { amenity: "veterinary", name: "Clinique de Creil" }, 49.2583, 2.4833);
    const local = el(21, { amenity: "veterinary", name: "Clinique de Lac-Mégantic" }, north(20), SAINT_LUDGER.lon);
    const { candidates, rejectedDistance } = toCandidates([creil, local], SAINT_LUDGER, { names: new Set(), sources: new Set() });
    expect(candidates.map((c) => c.name)).toEqual(["Clinique de Lac-Mégantic"]);
    expect(rejectedDistance).toBe(1);
  });

  it("garde les plus proches dans la limite de chaque catégorie, sans doublon de nom", () => {
    const mk = (i: number, category: Candidate["category"], kind: PlaceKind, km: number, name = `Lieu ${i}`): Candidate => ({
      category, kind, name, lat: 0, lon: 0, distanceM: km * 1000, sourceUrl: `https://www.openstreetmap.org/node/${i}`, tags: {},
    });
    const pool = [
      ...[5, 1, 9, 3, 7, 2].map((km, i) => mk(i, "vet", "vet", km)),
      mk(50, "general_park", "forest", 4, "Bois Joli"),
      mk(51, "walk_trail", "path", 2, "Bois Joli"),
    ];
    const out = selectByCategory(pool, { vet: 1 });
    expect(out.filter((c) => c.category === "vet").map((c) => c.distanceM / 1000)).toEqual([1, 2, 3]);
    expect(out.filter((c) => c.name === "Bois Joli")).toHaveLength(1);
  });
});

describe("GL2, collecte d'un guide à l'étranger (Saint Ludger, Québec)", () => {
  it("élargit le rayon pour les seules catégories manquantes, n'interroge jamais la BAN, et ne garde que du sourcé", async () => {
    const queries: string[] = [];
    const { fn, calls } = fakeFetch({
      overpass: (q) => {
        queries.push(q);
        if (q.includes("around:5000,")) {
          return [
            el(1, { landuse: "forest", name: "Forêt de Saint-Ludger" }, north(2), SAINT_LUDGER.lon, "way"),
            el(2, { leisure: "park", name: "Parc municipal" }, north(0.2), SAINT_LUDGER.lon, "way"),
            el(3, { leisure: "park", name: "Parc de l'église" }, north(0.5), SAINT_LUDGER.lon, "way"),
            el(4, { route: "hiking", name: "Sentier de la rivière Chaudière", distance: "6.5" }, north(3), SAINT_LUDGER.lon, "relation"),
            el(5, { highway: "path", name: "Sentier du Belvédère" }, north(4), SAINT_LUDGER.lon, "way"),
          ];
        }
        if (q.includes("around:15000,")) return [];
        if (q.includes("around:30000,")) {
          return [el(6, { amenity: "veterinary", name: "Hôpital vétérinaire du Granit", phone: "+1 819 583 0000" }, north(25), SAINT_LUDGER.lon)];
        }
        return [
          el(7, { amenity: "veterinary", name: "Clinique vétérinaire Beauce" }, north(45), SAINT_LUDGER.lon),
          el(8, { shop: "pet", name: "Animalerie Saint-Georges", "addr:street": "1re Avenue", "addr:housenumber": "11000", "addr:city": "Saint-Georges" }, north(48), SAINT_LUDGER.lon),
        ];
      },
      nominatim: (url) =>
        url.includes("/reverse")
          ? { address: { road: "Rue Laval", house_number: "5000", postcode: "G6B 1A1", town: "Lac-Mégantic" } }
          : [],
    });

    const res = await collectPlaces(
      { city: "Saint Ludger", postalCode: "G0M1W0", center: SAINT_LUDGER },
      { names: new Set(), sources: new Set(), counts: {} },
      fn,
      noSleep,
    );

    expect(calls.some((u) => u.includes("api-adresse.data.gouv.fr"))).toBe(false);
    expect(queries[0]).toContain("around:5000,");
    // Une requête courte par filtre.
    expect(queries.every((q) => (q.match(/around:/g) ?? []).length === 1)).toBe(true);
    // Les parcs, forêts et sentiers sont trouvés à 5 km : ils ne sont plus cherchés plus loin.
    const wider = queries.filter((q) => !q.includes("around:5000,"));
    expect(wider.some((q) => /forest|"park"|hiking/.test(q))).toBe(false);
    expect(wider.some((q) => q.includes("veterinary"))).toBe(true);

    const names = res.rows.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining([
      "Forêt de Saint-Ludger",
      "Sentier de la rivière Chaudière",
      "Hôpital vétérinaire du Granit",
      "Clinique vétérinaire Beauce",
      "Animalerie Saint-Georges",
    ]));
    for (const r of res.rows) {
      expect(r.source_url).toMatch(/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/);
      expect(r.address).not.toMatch(/\b76000\b|Oise|France/);
      expect(r.distance_km).toBeLessThanOrEqual(52);
    }
    const vet = res.rows.find((r) => r.name === "Hôpital vétérinaire du Granit")!;
    expect(vet.description).toBe("Cabinet vétérinaire à 25 km du centre de Saint Ludger.");
    expect(vet.tips).toBe("Téléphone : +1 819 583 0000.");
    expect(vet.address).toBe("5000 Rue Laval, G6B 1A1 Lac-Mégantic");
    const trail = res.rows.find((r) => r.name === "Sentier de la rivière Chaudière")!;
    expect(trail.description).toBe("Itinéraire de randonnée de 6,5 km, à 3,0 km du centre de Saint Ludger.");
    expect(res.radiiUsed.vet).toBe(30000);
  });

  it("une panne Overpass est signalée, aucun lieu n'est inventé", async () => {
    const { fn } = fakeFetch({ overpass: () => null });
    const res = await collectPlaces(
      { city: "Saint Ludger", postalCode: "G0M1W0", center: SAINT_LUDGER },
      { names: new Set(), sources: new Set(), counts: {} },
      fn,
      noSleep,
    );
    expect(res.overpassFailed).toBe(true);
    expect(res.rows).toEqual([]);
  });

  it("un lieu déjà sourcé n'est jamais ajouté deux fois", async () => {
    const forest = el(1, { landuse: "forest", name: "Forêt de Saint-Ludger" }, north(2), SAINT_LUDGER.lon, "way");
    const { fn } = fakeFetch({ overpass: () => [forest] });
    const res = await collectPlaces(
      { city: "Saint Ludger", postalCode: "G0M1W0", center: SAINT_LUDGER },
      { names: new Set(), sources: new Set(["https://www.openstreetmap.org/way/1"]), counts: { general_park: 1 } },
      fn,
      noSleep,
    );
    expect(res.rows).toEqual([]);
  });
});

describe("GL1, centre réel du guide", () => {
  it("à l'étranger : Nominatim dans le bon pays, homonyme départagé par le lieu du propriétaire", async () => {
    const { fn, calls } = fakeFetch({
      nominatim: () => [
        { lat: "48.4333", lon: "-71.9667", address: { state: "Québec", village: "Saint-Ludger-de-Milot" } },
        { lat: "45.7500", lon: "-70.6833", address: { state: "Québec", village: "Saint-Ludger" } },
      ],
    });
    const c = await resolveGuideCenter(
      { city: "Saint Ludger", postalCode: "G0M1W0", country: "CA", hint: { lat: 45.74, lon: -70.69 } },
      fn,
    );
    expect(c).toEqual({ lat: 45.75, lon: -70.6833, country: "CA", region: "Québec" });
    expect(calls[0]).toContain("countrycodes=ca");
    expect(calls.some((u) => u.includes("api-adresse"))).toBe(false);
  });

  it("en France : BAN avec le code postal, commune au nom exact", async () => {
    const { fn, calls } = fakeFetch({
      ban: () => ({ features: [{ geometry: { coordinates: [-1.6778, 48.1173] }, properties: { name: "Rennes", score: 0.97, context: "35, Ille-et-Vilaine, Bretagne" } }] }),
    });
    const c = await resolveGuideCenter({ city: "Rennes", postalCode: "35000", country: "FR", hint: null }, fn);
    expect(c).toEqual({ lat: 48.1173, lon: -1.6778, country: "FR", region: "Bretagne" });
    expect(calls[0]).toContain("postcode=35000");
  });

  it("en France : une réponse approximative de la BAN n'est jamais prise pour la commune", async () => {
    const { fn } = fakeFetch({
      ban: () => ({ features: [{ geometry: { coordinates: [2.1, 47.1] }, properties: { name: "Saint-Laurent", score: 0.41, context: "18, Cher, Centre-Val de Loire" } }] }),
    });
    expect(await resolveGuideCenter({ city: "Essaouira", postalCode: null, country: "FR", hint: null }, fn)).toBeNull();
  });

  it("sans réponse du géocodeur : lieu du propriétaire arrondi au kilomètre, jamais tel quel", async () => {
    const { fn } = fakeFetch({ nominatim: () => [] });
    const c = await resolveGuideCenter({ city: "Taravao", postalCode: "98719", country: "PF", hint: { lat: -17.75612, lon: -149.29878 } }, fn);
    expect(c).toEqual({ lat: -17.76, lon: -149.3, country: "PF", region: null });
  });

  it("un homonyme à plus de 60 km de l'indice n'est pas retenu", () => {
    expect(pickNearest([{ lat: 48.43, lon: -71.97 }], { lat: 45.74, lon: -70.69 })).toBeNull();
  });

  it("la BAN sert la France et les DROM, pas la Polynésie ni la Nouvelle-Calédonie", () => {
    expect(usesBan("FR", "97410")).toBe(true);
    expect(usesBan("FR", "98714")).toBe(false);
    expect(usesBan("CA", "G0M1W0")).toBe(false);
  });

  it("homonymes : département en France, pays ailleurs, même règle qu'en base", () => {
    const sql = readFileSync("supabase/prepared-migrations/20261013100000_gl_guides_lieux_sources.sql", "utf8");
    expect(sql).toContain("guide_homonym_slug");
    expect(baseSlug("Saint Ludger")).toBe("saint-ludger");
    expect(homonymSlug("saint-pierre", { lat: 0, lon: 0, country: "FR", region: null }, "97250")).toBe("saint-pierre-972");
    expect(homonymSlug("laval", { lat: 0, lon: 0, country: "CA", region: null }, "H7N")).toBe("laval-ca");
    expect(homonymSlug("x", { lat: 0, lon: 0, country: "FR", region: null }, "")).toBe("x-fr");
  });
});

describe("GL2, textes et liens", () => {
  const kinds: PlaceKind[] = ["dog_park", "park", "nature_reserve", "forest", "hiking_route", "path", "vet", "pet_shop", "cafe", "restaurant"];

  it("descriptions factuelles : aucun tiret long, aucune tournure négative", () => {
    for (const kind of kinds) {
      for (const d of [200, 800, 3200, 18000]) {
        const txt = describePlace({ kind, distanceM: d, tags: { dog: "leashed", distance: "4" } }, "Saint Ludger");
        expect(txt).not.toMatch(/[–—]/);
        expect(txt).not.toMatch(/\b(ne|n'|pas|non|aucun|sans)\b/i);
        expect(txt).toContain("Saint Ludger");
      }
    }
  });

  it("distances lisibles", () => {
    expect(formatDistance(420)).toBe("400 m");
    expect(formatDistance(3240)).toBe("3,2 km");
    expect(formatDistance(18400)).toBe("18 km");
  });

  it("l'invite d'introduction nomme le vrai pays et interdit les noms inventés", () => {
    const p = introPrompt("Saint Ludger", SAINT_LUDGER, ["Forêt de Saint-Ludger"]);
    expect(p).toContain("Saint Ludger, Québec, Canada");
    expect(p).not.toContain("en France");
    expect(p).toContain("Forêt de Saint-Ludger");
    expect(stripDashes("Un village calme — idéal")).toBe("Un village calme, idéal");
  });

  it("lien itinéraire Google Maps : fiche exacte si connue, sinon coordonnées", () => {
    expect(directionsUrl({ name: "Clinique", latitude: 45.7, longitude: -70.6, google_place_id: "ChIJ123", address: "5 Rue Laval" }))
      .toBe("https://www.google.com/maps/dir/?api=1&destination=Clinique%2C%205%20Rue%20Laval&destination_place_id=ChIJ123");
    expect(directionsUrl({ name: "Forêt", latitude: 45.7, longitude: -70.6 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=45.7,-70.6",
    );
    expect(directionsUrl({ name: "Sans point", latitude: null, longitude: null })).toBeNull();
    expect(googlePlaceUrl({ name: "Forêt" })).toBeNull();
  });

  it("rapprochement Google : identifiant seul, jamais la note, rejet au-delà de la tolérance", async () => {
    let mask = "";
    const fetchFn = async (_url: string, init?: RequestInit) => {
      mask = String((init?.headers as Record<string, string>)["X-Goog-FieldMask"]);
      return new Response(JSON.stringify({ places: [{ id: "ChIJfar", location: { latitude: 45.75, longitude: -70.69 } }] }));
    };
    const res = await matchGooglePlaceId(
      { name: "Clinique", address: "Lac-Mégantic", latitude: 45.70, longitude: -70.69, kind: "vet" },
      "CA",
      "k",
      fetchFn,
    );
    expect(mask).toBe("places.id,places.location");
    expect(res).toEqual({ placeId: null, status: "trop_loin" });
    expect((await matchGooglePlaceId({ name: "F", address: "", latitude: 0, longitude: 0, kind: "forest" }, "CA", "k", fetchFn)).status)
      .toBe("hors_perimetre");
  });

  it("chaque catégorie a un rayon maximal et un minimum cohérents", () => {
    for (const c of ALL_CATEGORIES) {
      expect(CATEGORY_RULES[c].min).toBeLessThanOrEqual(CATEGORY_RULES[c].max);
      // 80 km pour un vétérinaire seulement (zone rurale), 50 km ailleurs.
      expect(CATEGORY_RULES[c].maxRadius).toBeLessThanOrEqual(c === "vet" ? 80000 : 50000);
    }
  });
});

describe("GL2, générateur sans lieux inventés", () => {
  const gen = readFileSync("supabase/functions/generate-city-guide/index.ts", "utf8");
  it("n'invente plus de lieux, ne géocode plus en France par défaut", () => {
    expect(gen).not.toMatch(/Liste les .* les plus connus/);
    expect(gen).not.toContain("countrycodes=fr");
    expect(gen).not.toContain("en France. Liste");
    expect(gen).toContain("publish_when_sourced: true");
    expect(gen).not.toContain("ai.gateway");
  });
});

describe("GL1, demande incohérente", () => {
  it("une commune trouvée loin du lieu indiqué n'est pas remplacée par ce lieu", async () => {
    const { fn } = fakeFetch({
      ban: () => ({ features: [{ geometry: { coordinates: [2.35, 48.85] }, properties: { name: "Paris", score: 0.95, context: "75, Paris, Île-de-France" } }] }),
    });
    const c = await resolveGuideCenter({ city: "Paris", postalCode: "75001", country: "FR", hint: { lat: 45.74, lon: -70.69 } }, fn);
    expect(c).toBeNull();
  });
});

describe("GL, fiabilité (13/10/2026)", () => {
  it("Polynésie et Nouvelle-Calédonie : code pays OpenStreetMap", async () => {
    const { fn, calls } = fakeFetch({ nominatim: () => [{ lat: "-17.535", lon: "-149.569", address: { state: "Îles du Vent" } }] });
    await resolveGuideCenter({ city: "Papeete", postalCode: "98714", country: "FR", hint: null }, fn);
    expect(calls[0]).toContain("countrycodes=pf");
  });

  it("une réponse Overpass tronquée par un délai est ignorée, le miroir suivant est essayé", async () => {
    const urls: string[] = [];
    const fn = async (url: string) => {
      urls.push(url);
      if (url.includes("overpass-api.de")) {
        return new Response(JSON.stringify({ elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 30 seconds.' }));
      }
      return new Response(JSON.stringify({ elements: [el(1, { amenity: "veterinary", name: "Véto" }, north(2), SAINT_LUDGER.lon)] }));
    };
    const { runOverpass } = await import("../../../supabase/functions/_shared/guide-places/source");
    const els = await runOverpass("q", fn);
    expect(els).toHaveLength(1);
    expect(urls[1]).toContain("mail.ru");
  });

  it("à l'étranger, un géocodeur indisponible garde le vétérinaire avec sa distance", async () => {
    const fn = async (url: string) => {
      if (url.includes("nominatim")) return new Response("blocked", { status: 403 });
      return new Response(JSON.stringify({ elements: [el(6, { amenity: "veterinary", name: "Hôpital vétérinaire du Granit" }, north(25), SAINT_LUDGER.lon)] }));
    };
    const res = await collectPlaces(
      { city: "Saint Ludger", postalCode: "G0M1W0", center: SAINT_LUDGER },
      { names: new Set(), sources: new Set(), counts: {} },
      fn,
      noSleep,
    );
    const vet = res.rows.find((r) => r.category === "vet");
    expect(vet?.address).toBe("25 km du centre de Saint Ludger");
    expect(res.incomplete).toBe(false);
  });
});

describe("GL, code postal générique", () => {
  it("Lyon « 69000 » : sans résultat au code postal, la commune du même département est retenue", async () => {
    const { fn, calls } = fakeFetch({
      ban: (url) =>
        url.includes("postcode=")
          ? { features: [] }
          : {
              features: [
                { geometry: { coordinates: [4.83, 45.76] }, properties: { name: "Lyon", score: 0.97, citycode: "69123", context: "69, Rhône" } },
                { geometry: { coordinates: [-0.5, 47.4] }, properties: { name: "Lyon", score: 0.9, citycode: "49999", context: "49, Maine-et-Loire" } },
              ],
            },
    });
    const c = await resolveGuideCenter({ city: "Lyon", postalCode: "69000", country: "FR", hint: null }, fn);
    expect(c).toEqual({ lat: 45.76, lon: 4.83, country: "FR", region: "Rhône" });
    expect(calls).toHaveLength(2);
  });
});

describe("GL, forme de la requête Overpass", () => {
  it("le rayon précède toujours les étiquettes (forme qui répond, mesurée le 13/10/2026)", () => {
    const q = buildOverpassQuery(ALL_CATEGORIES, 5000, 45.74, -70.69);
    const statements = q.slice(q.indexOf("(") + 1, q.lastIndexOf(");out")).split(";").filter(Boolean);
    expect(statements.length).toBeGreaterThan(8);
    for (const st of statements) expect(st).toMatch(/^(nwr|wr|way|relation)\(around:5000,45\.74,-70\.69\)\[/);
  });
});

describe("GL, diagnostic Overpass", () => {
  it("chaque essai est noté (miroir, durée, issue), requête en GET", async () => {
    const { runOverpass } = await import("../../../supabase/functions/_shared/guide-places/source");
    const attempts: any[] = [];
    const methods: string[] = [];
    const fn = async (url: string, init?: RequestInit) => {
      methods.push(String(init?.method));
      if (url.includes("overpass-api.de")) return new Response("busy", { status: 429 });
      return new Response(JSON.stringify({ elements: [] }));
    };
    const els = await runOverpass("[out:json][timeout:25];x;", fn, 1000, Date.now() + 60000, (a) => attempts.push(a));
    expect(els).toEqual([]);
    expect(methods.every((m) => m === "GET")).toBe(true);
    expect(attempts.map((a) => a.outcome)).toEqual(["http_429", "ok"]);
    expect(attempts[0].mirror).toBe("overpass-api.de");
  });
});

describe("GL, qualité des lieux (essai Lyon du 13/10/2026)", () => {
  it("écarte les espaces de déjection et les traboules", () => {
    expect(categorize(el(1, { leisure: "dog_park", name: "Espace de Déjection Canine" }, 0, 0))).toBeNull();
    expect(categorize(el(2, { route: "foot", name: "Traboule du Gouverneur" }, 0, 0))).toBeNull();
    expect(categorize(el(3, { leisure: "dog_park", name: "Aire canine de la Visitation" }, 0, 0))?.category).toBe("dog_park");
  });
});

describe("GL, filtres sans réponse (essai Saint-Ludger du 13/10/2026)", () => {
  it("un filtre sans réponse n'arrête pas l'élargissement des autres catégories", async () => {
    const radii: number[] = [];
    const batch = async (queries: string[]) => {
      const r = Number(/around:(\d+)/.exec(queries[0])![1]);
      radii.push(r);
      return queries.map((q) => {
        if (q.includes("forest")) return null;
        if (r === 30000 && q.includes("veterinary")) {
          return [el(6, { amenity: "veterinary", name: "Hôpital vétérinaire du Granit", "addr:street": "Rue Laval" }, north(25), SAINT_LUDGER.lon)];
        }
        return [];
      });
    };
    const res = await collectPlaces(
      { city: "Saint Ludger", postalCode: "G0M1W0", center: SAINT_LUDGER },
      { names: new Set(), sources: new Set(), counts: {} },
      async () => new Response("[]"),
      noSleep,
      Number.POSITIVE_INFINITY,
      undefined,
      batch,
    );
    expect(radii).toEqual([5000, 15000, 30000, 50000]);
    expect(res.rows.map((r) => r.name)).toContain("Hôpital vétérinaire du Granit");
    expect(res.incomplete).toBe(true);
  });

  it("la recherche des chemins par leur nom reste sous 15 km", () => {
    expect(buildOverpassQuery(["walk_trail"], 15000, 45, -70)).toContain("highway");
    expect(buildOverpassQuery(["walk_trail"], 30000, 45, -70)).not.toContain("highway");
  });
});

describe("GL, noms lisibles (essai Marrakech du 14/10/2026)", () => {
  it("nom français d'abord, sinon partie latine du nom local", () => {
    expect(displayName({ name: "Arset El Bilk عرصة البيلك" })).toBe("Arset El Bilk");
    expect(displayName({ name: "حديقة ماجوريل", "name:fr": "Jardin Majorelle" })).toBe("Jardin Majorelle");
    expect(displayName({ name: "Parc (حديقة)" })).toBe("Parc");
    expect(displayName({ name: "حديقة" })).toBe("حديقة");
    expect(displayName({ name: "Parc de la Tête d'Or" })).toBe("Parc de la Tête d'Or");
  });

  it("un chemin nommé « path1 » est écarté, un vrai nom de sentier reste", () => {
    const c = { lat: 31.63, lon: -7.99 };
    const els = [
      { type: "way", id: 1, lat: 31.64, lon: -7.99, tags: { highway: "path", name: "path1" } },
      { type: "way", id: 2, lat: 31.65, lon: -7.99, tags: { highway: "path", name: "Sentier de l'Ourika" } },
      { type: "way", id: 3, lat: 31.635, lon: -7.99, tags: { leisure: "park", name: "Arset El Bilk عرصة البيلك" } },
    ];
    const out = compactElements(els as any, c);
    expect(out.map((e) => e.tags!.name)).toEqual(["Arset El Bilk", "Sentier de l'Ourika"]);
  });
});

describe("GL, vétérinaire en zone rurale (Saint-Ludger, 14/10/2026)", () => {
  it("80 km seulement pour une catégorie encore vide à 50 km", () => {
    expect(categoriesToWiden({ vet: 0, pet_shop: 0, general_park: 4, walk_trail: 4, dog_park: 3, dog_friendly_cafe: 3, dog_friendly_restaurant: 3 }, 80000)).toEqual(["vet"]);
    expect(categoriesToWiden({ vet: 1, pet_shop: 1, general_park: 4, walk_trail: 4, dog_park: 3, dog_friendly_cafe: 3, dog_friendly_restaurant: 3 }, 80000)).toEqual([]);
    expect(categoriesToWiden({ vet: 1 }, 50000)).toContain("vet");
  });

  it("un vétérinaire à 75 km est gardé, une forêt à 75 km est écartée", () => {
    expect(withinGuide("vet", 75000)).toBe(true);
    expect(withinGuide("vet", 83000)).toBe(false);
    expect(withinGuide("general_park", 75000)).toBe(false);
  });
});

describe("GL, guide nommé d'après un pays (Beaujolais, 14/10/2026)", () => {
  it("nom absent des communes : centre de la commune du code postal qui reprend le nom", async () => {
    const { fn, calls } = fakeFetch({
      ban: (url: string) =>
        url.includes("q=69220")
          ? {
              features: [
                { geometry: { coordinates: [4.75, 46.1] }, properties: { name: "Saint-Jean-d'Ardières", postcode: "69220", population: 900, context: "69, Rhône" } },
                { geometry: { coordinates: [4.74, 46.11] }, properties: { name: "Belleville-en-Beaujolais", postcode: "69220", population: 13000, context: "69, Rhône" } },
                { geometry: { coordinates: [4.8, 46.2] }, properties: { name: "Ailleurs", postcode: "71000", population: 99999, context: "71" } },
              ],
            }
          : { features: [{ geometry: { coordinates: [4.6, 46.0] }, properties: { name: "Beaujeu", score: 0.5, context: "69" } }] },
    });
    const c = await resolveGuideCenter({ city: "Beaujolais", postalCode: "69220", country: "FR", hint: null }, fn);
    expect(c).toEqual({ lat: 46.11, lon: 4.74, country: "FR", region: "Rhône" });
    expect(calls.some((u) => u.includes("q=69220"))).toBe(true);
  });
});
