/**
 * Lot GL4 (14/10/2026) : protocole de génération des guides, par passages.
 * Mesures du 13/10/2026 : Overpass refuse les fonctions serveur, pg_net
 * n'expédie les requêtes qu'après la fin de l'appel qui les dépose. Le guide
 * avance donc d'une étape par passage, sans attente.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

vi.stubGlobal("Deno", { env: { get: () => undefined } });

import {
  advanceGuide,
  nextMirror,
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
  const builder = (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let op: "select" | "update" | "delete" | "insert" | "upsert" = "select";
    let payload: any = null;
    let single = false;
    const run = async () => {
      const rows = tables[table];
      const match = rows.filter((r) => filters.every((f) => f(r)));
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
      select: () => b,
      eq: (k: string, v: any) => (filters.push((r) => r[k] === v), b),
      in: (k: string, v: any[]) => (filters.push((r) => v.includes(r[k])), b),
      is: (k: string, v: any) => (filters.push((r) => (r[k] ?? null) === v), b),
      not: () => b,
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
    client: {
      from: (t: string) => builder(t),
      rpc: async (fn: string, args: any) => {
        if (fn === "guide_osm_enqueue") {
          const id = ++seq;
          enqueued.push({ id, query: args.p_query, mirror: args.p_mirror });
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

describe("GL4, lecture des réponses", () => {
  it("réponse, délai, refus et remarque de délai Overpass", () => {
    expect(parseOsmResponse(null)).toBeNull();
    expect(parseOsmResponse({ status_code: 200, content: '{"elements":[1]}' })).toEqual({ elements: [1] });
    expect(parseOsmResponse({ status_code: 504, content: "busy" })).toEqual({ failure: "http_504" });
    expect(parseOsmResponse({ timed_out: true })).toEqual({ failure: "pg_net_timeout" });
    expect(parseOsmResponse({ status_code: 200, content: '{"elements":[],"remark":"runtime error: Query timed out"}' })).toEqual({ failure: "remark_timeout" });
  });

  it("miroirs : openstreetmap.fr, mail.ru, puis overpass-api.de", () => {
    expect(nextMirror(1)).toBe(2);
    expect(nextMirror(2)).toBe(0);
    expect(nextMirror(0)).toBe(1);
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
    expect(db.enqueued.length).toBeGreaterThan(5);
    expect(db.enqueued.every((e) => e.query.includes("around:5000,"))).toBe(true);
    expect(db.enqueued.slice(0, 3).map((e) => e.mirror)).toEqual([1, 2, 0]);
  });

  it("réponses absentes : attente ; refus : renvoi sur le miroir suivant", async () => {
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    const first = db.enqueued[0];
    db.net[first.id] = { status_code: 504, content: "busy" };
    const r = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    expect(r.etape).toBe("attente");
    const resent = db.enqueued[db.enqueued.length - 1];
    expect(resent.query).toBe(first.query);
    expect(resent.mirror).toBe(nextMirror(first.mirror));
  });

  it("rayon vide : élargit aux seules catégories manquantes, puis termine avec des lieux sourcés", async () => {
    const answer = (fill: (q: string) => any[]) => {
      for (const e of db.enqueued) if (!db.net[e.id]) db.net[e.id] = { status_code: 200, content: JSON.stringify({ elements: fill(e.query) }) };
    };
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    // Trois forêts à 5 km : la catégorie atteint son minimum (3), elle n'est plus élargie.
    answer((q) => (q.includes("forest")
      ? [node(10, { landuse: "forest", name: "Forêt de Saint-Ludger" }, north(2)), node(12, { landuse: "forest", name: "Bois du Rang 9" }, north(3)), node(13, { landuse: "forest", name: "Forêt des Érables" }, north(4))]
      : []));
    const r2 = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    expect(r2).toMatchObject({ etape: "elargissement", rayon: 15000 });
    expect((r2.categories as string[])).not.toContain("general_park");
    answer(() => []);
    const r3 = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    expect(r3).toMatchObject({ etape: "elargissement", rayon: 30000 });
    answer((q) => (q.includes("veterinary") ? [node(11, { amenity: "veterinary", name: "Hôpital vétérinaire du Granit", "addr:street": "Rue Laval", "addr:housenumber": "5000" }, north(25))] : []));
    const r4 = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    expect(r4.etape).toBe("elargissement");
    answer(() => []);
    const r5 = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    expect(r5).toMatchObject({ etape: "termine", result: "ok" });

    const places = db.tables.city_guide_places;
    expect(places.map((p) => p.name).sort()).toEqual(["Bois du Rang 9", "Forêt de Saint-Ludger", "Forêt des Érables", "Hôpital vétérinaire du Granit"]);
    expect(places.every((p) => /^https:\/\/www\.openstreetmap\.org\//.test(p.source_url))).toBe(true);
    const g = db.tables.city_guides[0];
    expect(g.places_sourced_at).toBeTruthy();
    expect(g.intro).toContain("Saint Ludger (Québec, Canada)");
    expect(g.intro).toContain("Hôpital vétérinaire du Granit");
    expect(g.places_source_report.redaction.source).toBe("factuel");
    expect(db.tables.guide_osm_requests).toHaveLength(0);
  });

  it("essai à blanc : rapport et lignes, rien d'inséré, file vidée", async () => {
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: true, googleKey: null });
    for (let i = 0; i < 6; i++) {
      for (const e of db.enqueued) if (!db.net[e.id]) db.net[e.id] = { status_code: 200, content: '{"elements":[]}' };
      const r = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
      if (r.etape === "termine") {
        expect(r.result).toBe("dry_run");
        break;
      }
    }
    expect(db.tables.city_guide_places).toHaveLength(0);
    expect(db.tables.city_guides[0].places_sourced_at).toBeNull();
    expect(db.tables.guide_osm_requests).toHaveLength(0);
  });

  it("une partie des requêtes sans réponse après deux miroirs : guide terminé en partiel, laissé en file", async () => {
    await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
    for (let i = 0; i < 10; i++) {
      for (const e of db.enqueued) {
        if (db.net[e.id]) continue;
        db.net[e.id] = e.query.includes("veterinary") ? { status_code: 504, content: "busy" } : { status_code: 200, content: '{"elements":[]}' };
      }
      const r = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
      if (r.etape === "termine") {
        expect(r.result).toBe("partiel");
        break;
      }
    }
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
    let last: any = null;
    for (let i = 0; i < 4; i++) {
      for (const e of db.enqueued) if (!db.net[e.id]) db.net[e.id] = { status_code: 504, content: "busy" };
      last = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null });
      if (last.result !== "en_cours") break;
    }
    expect(last.result).toBe("overpass_indisponible");
    const g = db.tables.city_guides[0];
    expect(g.places_sourced_at).toBeNull();
    expect(g.places_source_passes).toBe(0);
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
    let r: any;
    for (let i = 0; i < 6; i++) {
      for (const e of db.enqueued) if (!db.net[e.id]) db.net[e.id] = { status_code: 200, content: '{"elements":[]}' };
      r = await advanceGuide(db.client, db.tables.city_guides[0], { dryRun: false, googleKey: null, deadline: Date.now() + 10_000 });
      if (r.detail === "fin_au_passage_suivant") break;
    }
    expect(r.detail).toBe("fin_au_passage_suivant");
    expect(db.tables.guide_osm_requests.length).toBeGreaterThan(0);
  });
});
