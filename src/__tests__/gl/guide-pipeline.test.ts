/**
 * Lot GL4 (14/10/2026) : protocole de génération des guides, par passages.
 * Mesures du 13/10/2026 : Overpass refuse les fonctions serveur, pg_net
 * n'expédie les requêtes qu'après la fin de l'appel qui les dépose. Le guide
 * avance donc d'une étape par passage, sans attente.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

vi.stubGlobal("Deno", { env: { get: () => undefined } });

// La base et les réponses OSM sont simulées : le géocodage inverse l'est aussi.
// Aucun appel réel à Nominatim ne doit décider du résultat de ce test de protocole.
vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === "nominatim.openstreetmap.org" && url.pathname === "/reverse") {
    return new Response(JSON.stringify({ address: { village: "Saint Ludger", postcode: "G0M1W0" } }), { status: 200 });
  }
  throw new Error(`Appel réseau non simulé dans le test GL4 : ${url.href}`);
}));

import {
  advanceGuide,
  mirrorForTry,
  IN_FLIGHT_MAX,
  parseOsmResponse,
  poolFrom,
  statementsFor,
  writeIntro,
} from "../../../supabase/functions/_shared/guide-places/pipeline";
import {
  CURATED_SLUGS,
  compactElements,
  factualIntro,
  introProblems,
  placeLabel,
} from "../../../supabase/functions/_shared/guide-places/source";
import { GUIDE_OVERRIDES } from "@/data/guideOverrides";

const SL = { lat: 45.742131, lon: -70.694618, country: "CA", region: "Québec" };
const north = (km: number) => SL.lat + km / 111.2;
const node = (id: number, tags: Record<string, string>, lat: number, lon = SL.lon) => ({ type: "node", id, lat, lon, tags });

// ---------------------------------------------------------------------------
// Base simulée : juste ce que le protocole utilise.
// ---------------------------------------------------------------------------
type Row = Record<string, any>;
function fakeDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = { guide_osm_requests: [], city_guide_places: [], city_guides: [], guide_requests: [], ...seed };
  let seq = 1000;
  const net: Record<number, any> = {};
  const enqueued: { id: number; query: string; mirror: number }[] = [];
  const ctl = { enqueueError: false };
  const geocoded: { id: number; params: Record<string, string> }[] = [];
  const builder = (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let op: "select" | "update" | "delete" | "insert" | "upsert" = "select";
    let payload: any = null;
    let single = false;
    let countOnly = false;
    const run = async () => {
      const rows = tables[table];
      const match = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "select" && countOnly) return { data: null, count: match.length, error: null };
      if (op === "select") return { data: single ? match[0] ?? null : match, error: null };
      if (op === "update") {
        match.forEach((r) => Object.assign(r, payload));
        return { data: match, error: null };
      }
      if (op === "delete") {
        tables[table] = rows.filter((r) => !match.includes(r));
        return { data: match, error: null };
      }
      const list: Row[] = (Array.isArray(payload) ? payload : [payload]).map((r: Row) => ({ id: r.id ?? `${table}-${++seq}`, updated_at: new Date().toISOString(), ...r }));
      const out: Row[] = [];
      for (const r of list) {
        if (op === "upsert" && rows.some((x) => x.city_guide_id === r.city_guide_id && x.source_url === r.source_url)) continue;
        rows.push(r);
        out.push(r);
      }
      return { data: out, error: null };
    };
    const b: any = {
      select: (_c?: string, o?: { head?: boolean }) => ((countOnly = !!o?.head), b),
      eq: (k: string, v: any) => (filters.push((r) => r[k] === v), b),
      in: (k: string, v: any[]) => (filters.push((r) => v.includes(r[k])), b),
      is: (k: string, v: any) => (filters.push((r) => (r[k] ?? null) === v), b),
      not: (k: string, _op: string, v: any) => (filters.push((r) => (r[k] ?? null) !== v), b),
      or: () => b,
      order: () => b,
      limit: () => b,
      maybeSingle: () => ((single = true), run()),
      single: () => ((single = true), run()),
      update: (p: any) => ((op = "update"), (payload = p), b),
      delete: () => ((op = "delete"), b),
      insert: (p: any) => ((op = "insert"), (payload = p), b),
      upsert: (p: any) => ((op = "upsert"), (payload = p), b),
      then: (ok: any, ko: any) => run().then(ok, ko),
    };
    return b;
  };
  return {
    tables,
    net,
    enqueued,
    ctl,
    geocoded,
    client: {
      from: (t: string) => builder(t),
      rpc: async (fn: string, args: any) => {
        if (fn === "guide_osm_enqueue") {
          if (ctl.enqueueError) return { data: null, error: { code: "57014" } };
          const id = ++seq;
          enqueued.push({ id, query: args.p_query, mirror: args.p_mirror });
          return { data: id, error: null };
        }
        if (fn === "guide_geocode_enqueue") {
          const id = ++seq;
          geocoded.push({ id, params: args.p_params });
          return { data: id, error: null };
        }
        if (fn === "guide_osm_result") return { data: net[args.p_id] ? [net[args.p_id]] : [], error: null };
        return { data: null, error: null };
      },
    },
  };
}

const guideRow = (extra: Row = {}) => ({
  id: "g-sl", slug: "saint-ludger", city: "Saint Ludger", postal_code: "G0M1W0", department: "Québec",
  country: "CA", latitude: SL.lat, longitude: SL.lon, published: true, publish_when_sourced: false,
  places_sourced_at: null, places_source_passes: 0, places_source_report: { centre_final: SL }, ...extra,
});

/** Fait avancer le guide en répondant aux requêtes parties, jusqu'à une étape attendue. */
async function runUntil(
  db: ReturnType<typeof fakeDb>,
  answer: (query: string) => any,
  stop: (r: any) => boolean,
  opts: Record<string, any> = {},
  max = 30,
) {
  let r: any = null;
  for (let i = 0; i < max; i++) {
    for (const e of db.enqueued) if (!db.net[e.id]) db.net[e.id] = answer(e.query);
    r = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null, ...opts });
    if (stop(r)) return r;
  }
  return r;
}
const ok = (els: any[]) => ({ status_code: 200, content: JSON.stringify({ elements: els }) });

describe("GL4, lecture des réponses", () => {
  it("réponse, délai, refus et remarque de délai Overpass", () => {
    expect(parseOsmResponse(null)).toBeNull();
    expect(parseOsmResponse({ status_code: 200, content: '{"elements":[1]}' })).toEqual({ elements: [1] });
    expect(parseOsmResponse({ status_code: 504, content: "busy" })).toEqual({ failure: "http_504" });
    expect(parseOsmResponse({ timed_out: true })).toEqual({ failure: "pg_net_timeout" });
    expect(parseOsmResponse({ status_code: 200, content: '{"elements":[],"remark":"runtime error: Query timed out"}' })).toEqual({ failure: "remark_timeout" });
  });

  it("miroirs par essai : openstreetmap.fr deux fois, puis mail.ru", () => {
    expect([0, 1, 2, 3].map(mirrorForTry)).toEqual([1, 1, 2, 2]);
  });

  it("une réponse est réduite aux lieux utiles, dans le rayon, les plus proches d'abord", () => {
    const els = [
      node(1, { amenity: "veterinary", name: "Loin" }, north(45)),
      node(2, { amenity: "veterinary", name: "Près", opening_hours: "Mo-Fr" }, north(3)),
      node(3, { amenity: "bench" }, north(1)),
      node(4, { amenity: "veterinary", name: "Creil" }, 49.25, 2.48),
    ];
    const out = compactElements(els as any, SL);
    expect(out.map((e) => e.tags!.name)).toEqual(["Près", "Loin"]);
    expect(out[0].tags).not.toHaveProperty("opening_hours");
  });
});

describe("GL4, passages successifs (Saint-Ludger)", () => {
  let db: ReturnType<typeof fakeDb>;
  beforeEach(() => {
    db = fakeDb({ city_guides: [guideRow()] });
  });

  it("1er passage : envoie les requêtes du premier rayon et rend la main", async () => {
    const r = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    expect(r).toMatchObject({ etape: "collecte", rayon: 5000, result: "en_cours" });
    // Au plus IN_FLIGHT_MAX en vol, le reste attend son tour en file.
    expect(db.enqueued).toHaveLength(IN_FLIGHT_MAX);
    expect(db.tables.guide_osm_requests.filter((r) => r.net_id == null).length).toBeGreaterThan(0);
    expect(db.enqueued.every((e) => e.query.includes("around:5000,") && e.mirror === 1)).toBe(true);
  });

  it("réponses absentes : attente ; refus : renvoi sur openstreetmap.fr", async () => {
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    const first = db.enqueued[0];
    db.net[first.id] = { status_code: 504, content: "busy" };
    const r = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    expect(r.etape).toBe("attente");
    const resent = db.enqueued.filter((e) => e.query === first.query);
    expect(resent).toHaveLength(2);
    expect(resent[1].mirror).toBe(1);
    const row = db.tables.guide_osm_requests.find((x) => first.query.includes(x.statement));
    expect(row.tries).toBe(2);
  });

  it("rayon vide : élargit aux seules catégories manquantes, puis termine avec des lieux sourcés", async () => {
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    // Trois forêts à 5 km : la catégorie atteint son minimum (3), elle n'est plus élargie.
    const forests = [node(10, { landuse: "forest", name: "Forêt de Saint-Ludger" }, north(2)), node(12, { landuse: "forest", name: "Bois du Rang 9" }, north(3)), node(13, { landuse: "forest", name: "Forêt des Érables" }, north(4))];
    const vet = node(11, { amenity: "veterinary", name: "Hôpital vétérinaire du Granit", "addr:street": "Rue Laval", "addr:housenumber": "5000" }, north(25));
    const answer = (q: string) => ok(q.includes("around:5000,") && q.includes("forest") ? forests : q.includes("around:30000,") && q.includes("veterinary") ? [vet] : []);
    const r2 = await runUntil(db, answer, (r) => r.etape === "elargissement");
    expect(r2).toMatchObject({ etape: "elargissement", rayon: 15000 });
    expect(r2.categories as string[]).not.toContain("general_park");
    const end = await runUntil(db, answer, (r) => r.etape === "termine");
    expect(end).toMatchObject({ etape: "termine", result: "ok" });

    const places = db.tables.city_guide_places;
    expect(places.map((p) => p.name).sort()).toEqual(["Bois du Rang 9", "Forêt de Saint-Ludger", "Forêt des Érables", "Hôpital vétérinaire du Granit"]);
    expect(places.every((p) => /^https:\/\/www\.openstreetmap\.org\//.test(p.source_url))).toBe(true);
    const g = db.tables.city_guides[0];
    expect(g.places_sourced_at).toBeTruthy();
    expect(g.intro).toContain("Saint Ludger (Québec, Canada)");
    expect(g.intro).toContain("Hôpital vétérinaire du Granit");
    expect(g.places_source_report.redaction.source).toBe("factuel");
    expect(db.tables.guide_osm_requests).toHaveLength(0);
    // Jamais plus de IN_FLIGHT_MAX requêtes parties sans réponse relue.
    expect(IN_FLIGHT_MAX).toBe(6);
  });

  it("essai à blanc : rapport et lignes, rien d'inséré, file vidée", async () => {
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: true, googleKey: null });
    const r = await runUntil(db, () => ok([]), (x) => x.etape === "termine");
    expect(r.result).toBe("dry_run");
    expect(db.tables.city_guide_places).toHaveLength(0);
    expect(db.tables.city_guides[0].places_sourced_at).toBeNull();
    expect(db.tables.guide_osm_requests).toHaveLength(0);
  });

  it("une partie des requêtes sans réponse après trois essais : guide terminé en partiel, laissé en file", async () => {
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    const r = await runUntil(db, (q) => (q.includes("veterinary") ? { status_code: 504, content: "busy" } : ok([])), (x) => x.etape === "termine", {}, 60);
    expect(r.result).toBe("partiel");
    const g = db.tables.city_guides[0];
    expect(g.places_sourced_at).toBeNull();
    expect(g.places_source_passes).toBe(1);
  });
});

describe("GL4, rédaction vérifiée", () => {
  const places = [
    { category: "general_park", name: "Forêt de Saint-Ludger", distance_km: 2 },
    { category: "vet", name: "Hôpital vétérinaire du Granit", distance_km: 25 },
  ];

  it("un texte qui nomme un lieu absent de la liste est remplacé par le texte factuel", async () => {
    const ai = async () => ({ intro: "Promenez-vous au Parc de la Ludgerette, puis au bord du lac.", ideal_for: "Idéal pour les gardiens qui aiment marcher." });
    const t = await writeIntro({ city: "Saint Ludger", slug: "saint-ludger" }, SL, places, ai);
    expect(t.source).toBe("factuel");
    expect(t.problemes.join(" ")).toContain("Ludgerette");
    expect(t.intro).toContain("Saint Ludger (Québec, Canada)");
  });

  it("un texte qui ne cite que des lieux vérifiés est gardé, tirets longs retirés", async () => {
    const ai = async () => ({ intro: "Un village calme — la Forêt de Saint-Ludger est à deux pas.", ideal_for: "Idéal pour les gardiens qui aiment la forêt." });
    const t = await writeIntro({ city: "Saint Ludger", slug: "saint-ludger" }, SL, places, ai);
    expect(t.source).toBe("ia");
    expect(t.intro).not.toMatch(/[–—]/);
  });

  it("texte factuel : nombre de lieux, balades, vétérinaire le plus proche, sans tiret ni négation", () => {
    const f = factualIntro("Saint Ludger", placeLabel("Saint Ludger", "CA", "Québec"), places);
    expect(f.intro).toBe(
      "Ce guide réunit 2 lieux vérifiés dans OpenStreetMap autour de Saint Ludger (Québec, Canada). Pour promener un chien : Forêt de Saint-Ludger. Le vétérinaire le plus proche, Hôpital vétérinaire du Granit, se trouve à 25 km du centre.",
    );
    expect(f.intro + f.ideal_for).not.toMatch(/[–—]|\b(ne|pas|aucun|sans)\b/);
  });

  it("contrôle des lieux nommés", () => {
    expect(introProblems("La Clinique Vétérinaire des Bords de l'Oise est proche.", ["Forêt de Saint-Ludger"])).not.toEqual([]);
    expect(introProblems("La Forêt de Saint-Ludger est à deux pas.", ["Forêt de Saint-Ludger"])).toEqual([]);
  });

  it("les guides refondus à la main gardent leur texte : même liste que guideOverrides", () => {
    expect([...CURATED_SLUGS].sort()).toEqual(Object.keys(GUIDE_OVERRIDES).sort());
  });
});

describe("GL4, file et générateur", () => {
  it("statements d'un rayon sans doublon (cafés et restaurants partagent un filtre)", () => {
    const st = statementsFor(["dog_friendly_cafe", "dog_friendly_restaurant"], 5000, SL);
    expect(st).toHaveLength(1);
  });

  it("poolFrom ignore les requêtes échouées et retient le premier rayon d'une catégorie", () => {
    const { pool, radiiUsed } = poolFrom(
      [
        { status: "done", radius: 5000, elements: [node(1, { landuse: "forest", name: "Bois A" }, north(2))] as any },
        { status: "failed", radius: 5000, elements: null },
        { status: "done", radius: 15000, elements: [node(1, { landuse: "forest", name: "Bois A" }, north(2)), node(2, { landuse: "forest", name: "Bois B" }, north(9))] as any },
      ],
      SL,
      { names: new Set(), sources: new Set() },
    );
    expect(pool.map((p) => p.name)).toEqual(["Bois A", "Bois B"]);
    expect(radiiUsed.general_park).toBe(5000);
  });

  it("la fonction répond tout de suite et travaille en arrière-plan, le générateur passe la main à la file", () => {
    const fn = readFileSync("supabase/functions/source-guide-places/index.ts", "utf8");
    expect(fn).toContain("waitUntil");
    expect(fn).toContain("202");
    expect(fn).toContain("advanceGuide");
    // Un essai à blanc terminé n'est pas relancé par l'appel suivant (rapport gardé).
    expect(fn).toContain("freshDryRun");
    const gen = readFileSync("supabase/functions/generate-city-guide/index.ts", "utf8");
    expect(gen).toContain("publish_when_sourced: true");
    expect(gen).not.toContain("ai.gateway");
  });
});

describe("GL4, relecture (contrôles de rédaction et de collecte)", () => {
  it("contrôle : les mots communs passent, un nom propre absent est refusé, les tournures négatives aussi", () => {
    const ok = "Une place animée, un bois du coin et un jardin public autour de la Forêt de Saint-Ludger.";
    expect(introProblems(ok, ["Forêt de Saint-Ludger", "Saint Ludger"])).toEqual([]);
    expect(introProblems("Flânez sur les quais du Rhône.", ["Saint Ludger"])).not.toEqual([]);
    expect(introProblems("Ne manquez pas la forêt.", ["Saint Ludger"])).toContain("tournure_negative");
    expect(introProblems("Un coin calme, sans voitures.", ["Saint Ludger"])).toContain("tournure_negative");
  });

  it("un chemin découpé en tronçons ne prend qu'une place parmi les 60", () => {
    const segs = Array.from({ length: 80 }, (_, i) => ({ type: "way", id: i, lat: north(1 + i / 100), lon: SL.lon, tags: { highway: "path", name: "Sentier du Lac" } }));
    const other = { type: "way", id: 999, lat: north(4), lon: SL.lon, tags: { highway: "path", name: "Chemin des Érables" } };
    const out = compactElements([...segs, other] as any, SL);
    expect(out.map((e) => e.tags!.name)).toEqual(["Sentier du Lac", "Chemin des Érables"]);
  });
});

describe("GL4, relecture (file)", () => {
  it("aucune réponse sur tous les miroirs : le passage ne compte pas, rien n'est sourcé", async () => {
    const db = fakeDb({ city_guides: [guideRow()] });
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    const last = await runUntil(db, () => ({ status_code: 504, content: "busy" }), (r) => r.result !== "en_cours");
    expect(last.result).toBe("overpass_indisponible");
    const g = db.tables.city_guides[0];
    expect(g.places_sourced_at).toBeNull();
    expect(g.places_source_passes).toBe(0);
    expect(db.tables.guide_osm_requests).toHaveLength(0);
  });

  it("dépôt refusé par la base à chaque essai : requêtes notées en échec, le guide ne reste pas bloqué", async () => {
    const db = fakeDb({ city_guides: [guideRow()] });
    db.ctl.enqueueError = true;
    const last = await runUntil(db, () => ok([]), (r) => r.result !== "en_cours", {}, 12);
    expect(last.result).toBe("overpass_indisponible");
    expect(db.tables.guide_osm_requests).toHaveLength(0);
  });

  it("un essai à blanc demandé sur un guide déjà en cours en réel est refusé", async () => {
    const db = fakeDb({ city_guides: [guideRow()] });
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    const r = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: true, googleKey: null, explicit: true });
    expect(r.result).toBe("mode_different");
  });

  it("fin trop proche de la limite d'exécution : terminé au passage suivant", async () => {
    const db = fakeDb({ city_guides: [guideRow()] });
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    const r = await runUntil(db, () => ok([]), (x) => x.detail === "fin_au_passage_suivant", { deadline: Date.now() + 10_000 });
    expect(r.detail).toBe("fin_au_passage_suivant");
    expect(db.tables.guide_osm_requests.length).toBeGreaterThan(0);
  });
});

describe("GL5, centre hors BAN cherché par la base (Taravao, 14/10/2026)", () => {
  it("1er passage : deux recherches déposées, attente ; 2e passage : centre tiré des réponses, lieu du propriétaire ignoré", async () => {
    const db = fakeDb({
      city_guides: [guideRow({ id: "g-ta", slug: "taravao", city: "Taravao", postal_code: "98719", country: "PF", latitude: null, longitude: null, places_source_report: null })],
      guide_requests: [{ city_guide_id: "g-ta", slug: "taravao", country: "PF", latitude: -17.76, longitude: -148.74 }],
    });
    const g = db.tables.city_guides[0];
    const r1 = await advanceGuide(db.client, g, { dryRun: false, googleKey: null });
    expect(r1).toMatchObject({ etape: "centre", result: "en_cours", detail: "geocodage_en_attente" });
    expect(db.geocoded.map((x) => Object.keys(x.params).find((k) => k === "city" || k === "q"))).toEqual(["city", "q"]);
    expect(db.geocoded.every((x) => x.params.countrycodes === "fr")).toBe(true);
    expect(db.enqueued).toHaveLength(0);

    // La file écrit le rapport du passage, puis les réponses arrivent.
    g.places_source_report = r1;
    const [cityReq, qReq] = db.geocoded;
    db.net[cityReq.id] = { status_code: 200, content: "[]" };
    db.net[qReq.id] = {
      status_code: 200,
      content: JSON.stringify([
        { lat: "-17.7196", lon: "-149.3012", addresstype: "bay", address: {} },
        { lat: "-17.7257", lon: "-149.3135", addresstype: "town", address: { state: "Îles du Vent" } },
      ]),
    };
    const r2 = await advanceGuide(db.client, g, { dryRun: false, googleKey: null });
    expect(r2.etape).toBe("collecte");
    expect(g.latitude).toBeCloseTo(-17.7257, 3);
    expect(g.longitude).toBeCloseTo(-149.3135, 3);
    expect(db.enqueued.every((e) => e.query.includes("-17.7257") && e.query.includes("-149.3135"))).toBe(true);
  });
});
