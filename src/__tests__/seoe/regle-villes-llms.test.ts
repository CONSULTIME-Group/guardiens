/**
 * Lot SEO-E (25/10/2026, arène entraide, R4 et décision 5) : une page ville
 * d'entraide est indexable seulement avec au moins un besoin déposé dans son
 * rayon sur 90 jours. Une seule règle (entraideCityIndexability.js) pour la
 * page, le sitemap et llms.txt ; llms.txt décrit l'entraide actuelle.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectSitemapData } from "../../../supabase/functions/_shared/sitemap-data.js";
import { createSitemapDocument } from "../../../supabase/functions/sitemap/live.js";
import {
  ENTRAIDE_CITY_CENTERS,
  ENTRAIDE_CITY_RADIUS_KM,
  ENTRAIDE_CITY_WINDOW_DAYS,
  LLMS_ENTRAIDE_CITIES_RE,
  entraideCitiesLlmsBlock,
  entraideCitiesWithRecentNeed,
  entraideCityForPoint,
  houseSittingSlugFromCity,
  isEntraideCityIndexable,
  isEntraideCityPath,
} from "@/lib/entraideCityIndexability";
import { MISSIONS_CITIES, MISSIONS_CITY_SLUGS } from "@/data/missionsCityContent";
import { FIXED_EXCHANGE_OFFER } from "@/lib/entraideExchange";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const NOW = new Date("2026-10-25T10:00:00Z");
const LYON = { latitude: 45.76, longitude: 4.84 };

describe("règle partagée des pages villes", () => {
  it("un besoin déposé il y a moins de 90 jours dans le rayon rend la ville indexable, quel que soit son statut", () => {
    const rows = [{ ...LYON, created_on: "2026-09-21" }];
    expect(isEntraideCityIndexable("lyon", rows, NOW)).toBe(true);
    expect(isEntraideCityIndexable("strasbourg", rows, NOW)).toBe(false);
  });

  it("une ville sans besoin sur 90 jours n'est pas indexable", () => {
    expect(isEntraideCityIndexable("lyon", [], NOW)).toBe(false);
    expect(isEntraideCityIndexable("lyon", [{ ...LYON, created_on: "2026-07-01" }], NOW)).toBe(false);
    // Borne : le 27/07/2026 est le 90e jour avant le 25/10/2026, il compte.
    expect(isEntraideCityIndexable("lyon", [{ ...LYON, created_on: "2026-07-27" }], NOW)).toBe(true);
    expect(isEntraideCityIndexable("lyon", [{ ...LYON, created_on: "2026-07-26" }], NOW)).toBe(false);
  });

  it("le rayon est de 30 km autour du centre", () => {
    expect(ENTRAIDE_CITY_RADIUS_KM).toBe(30);
    // Vienne (environ 27 km de Lyon) compte, Bourgoin-Jallieu (environ 39 km) non.
    expect([...entraideCitiesWithRecentNeed([{ latitude: 45.52, longitude: 4.87, created_on: "2026-10-01" }], NOW)]).toEqual(["lyon"]);
    expect([...entraideCitiesWithRecentNeed([{ latitude: 45.59, longitude: 5.28, created_on: "2026-10-01" }], NOW)]).toEqual([]);
  });

  it("ville d'une fiche : la plus proche dont le rayon contient le point", () => {
    expect(entraideCityForPoint(45.76, 4.84)?.slug).toBe("lyon");
    expect(entraideCityForPoint(45.44, 4.39)?.slug).toBe("saint-etienne");
    expect(entraideCityForPoint(47.9, 1.9)).toBeNull();
    expect(entraideCityForPoint(null, 4)).toBeNull();
  });

  it("les centres égalent ceux des pages villes (src/data/missionsCityContent.ts)", () => {
    expect(ENTRAIDE_CITY_CENTERS.map((c) => c.slug)).toEqual(MISSIONS_CITY_SLUGS);
    for (const c of ENTRAIDE_CITY_CENTERS) {
      const page = MISSIONS_CITIES[c.slug];
      expect(page.coordinates).toEqual({ lat: c.lat, lng: c.lng });
      expect(page.radiusKm).toBe(ENTRAIDE_CITY_RADIUS_KM);
      expect(page.cityName).toBe(c.name);
      expect(isEntraideCityPath(`/petites-missions/${c.slug}`)).toBe(true);
    }
    expect(isEntraideCityPath("/petites-missions/un-besoin-de-jardinage")).toBe(false);
    expect(isEntraideCityPath("/petites-missions")).toBe(false);
  });

  it("la vue publique porte la même fenêtre de 90 jours, sans identifiant ni statut", () => {
    expect(ENTRAIDE_CITY_WINDOW_DAYS).toBe(90);
    const sql = read("drizzle/migrations/0101_seoe_activite_entraide_villes.sql");
    expect(sql).toContain("interval '90 days'");
    expect(sql).toContain("public_entraide_need_activity");
    expect(sql).toMatch(/GRANT SELECT ON public\.public_entraide_need_activity TO anon/);
    const select = sql.slice(sql.indexOf("SELECT"), sql.indexOf("FROM public.small_missions"));
    expect(select).not.toMatch(/\bm\.id AS|user_id|title|status|description/);
    expect(read("drizzle/migrations/meta/_journal.json")).toContain("0101_seoe_activite_entraide_villes");
  });

  it("la page, le sitemap et le générateur de llms.txt lisent la même règle", () => {
    expect(read("src/pages/MissionsCityPage.tsx")).toContain("isEntraideCityIndexable");
    expect(read("supabase/functions/_shared/sitemap-data.js")).toContain("entraideCitiesWithRecentNeed");
    expect(read("scripts/generate-sitemap.mjs")).toContain("entraideCitiesLlmsBlock");
    expect(read("src/lib/entraideCityIndexability.js")).toContain("supabase/functions/_shared/entraideCityIndexability.js");
  });

  it("slug /house-sitting dérivé du nom de ville", () => {
    expect(houseSittingSlugFromCity("Saint-Étienne")).toBe("saint-etienne");
    expect(houseSittingSlugFromCity("Caluire et Cuire")).toBe("caluire-et-cuire");
    expect(houseSittingSlugFromCity("")).toBeNull();
  });
});

describe("sitemap : une ville sans besoin sur 90 jours en sort", () => {
  const config = {
    version: 1,
    siteUrl: "https://guardiens.fr",
    staticPages: [
      { loc: "/", indexable: true, changefreq: "daily", priority: "1.0" },
      { loc: "/petites-missions", indexable: true, changefreq: "weekly", priority: "0.8" },
      ...MISSIONS_CITY_SLUGS.map((slug) => ({ loc: `/petites-missions/${slug}`, indexable: true, changefreq: "weekly", priority: "0.7" })),
    ],
    cityLandingPages: ["lyon"],
  };
  const collector = (db: Record<string, any[]>, failing: string[] = []) => collectSitemapData({
    today: NOW,
    maxUpdatedAtWithCount: () => null,
    fetchOrCache: async (_k: string, _c: object, _p: unknown, fetcher: () => Promise<any[]>, builder: (r: any[]) => any[]) => builder(await fetcher()),
    readAll: async (_s: string, table: string, _cols: string, _key: string, build?: (q: any) => any) => {
      if (failing.includes(table)) throw new Error(`${table}: relation absente`);
      let rows = [...(db[table] || [])];
      const q: any = {
        eq: (k: string, v: unknown) => { rows = rows.filter((r) => r[k] === v); return q; },
        neq: (k: string, v: unknown) => { rows = rows.filter((r) => r[k] !== v); return q; },
        in: (k: string, v: unknown[]) => { rows = rows.filter((r) => v.includes(r[k])); return q; },
        not: (k: string, _o: string, v: unknown) => { rows = rows.filter((r) => r[k] !== v); return q; },
        or: () => { rows = rows.filter((r) => r.noindex !== true); return q; },
      };
      build?.(q);
      return rows;
    },
  });

  it("garde Lyon (un besoin annulé du 21/09), sort Strasbourg et les villes sans besoin", async () => {
    const db = { public_entraide_need_activity: [{ activity_key: "k1", ...LYON, created_on: "2026-09-21" }] };
    const locs = createSitemapDocument(config, await collector(db), NOW).locs;
    expect(locs).toContain("/petites-missions/lyon");
    expect(locs).toContain("/petites-missions");
    expect(locs).not.toContain("/petites-missions/strasbourg");
    expect(locs.filter(isEntraideCityPath)).toEqual(["/petites-missions/lyon"]);
  });

  it("aucun besoin sur 90 jours : aucune page ville au sitemap", async () => {
    const locs = createSitemapDocument(config, await collector({ public_entraide_need_activity: [] }), NOW).locs;
    expect(locs.filter(isEntraideCityPath)).toEqual([]);
  });

  it("vue absente (migration pas encore appliquée) : les 14 villes restent, comme avant le lot", async () => {
    const locs = createSitemapDocument(config, await collector({}, ["public_entraide_need_activity"]), NOW).locs;
    expect(locs.filter(isEntraideCityPath)).toHaveLength(14);
  });
});

describe("llms.txt décrit l'entraide actuelle", () => {
  const llms = read("public/llms.txt");

  it("sans « Petites missions » ni « un service contre un service »", () => {
    expect(llms).not.toMatch(/Petites missions/i);
    expect(llms).not.toMatch(/un service contre un service/i);
    expect(llms).not.toMatch(/promenade, visite, dépannage/i);
  });

  it("coups de main près de chez soi, exemples du projet, « Je peux », phrase d'échange du modèle A, gratuité", () => {
    expect(llms).toContain("coups de main près de chez soi");
    for (const word of ["jardinage", "potager", "courses", "trajets", "jeux de société"]) expect(llms).toContain(word);
    expect(llms).toContain("« Je peux »");
    expect(llms).toContain(FIXED_EXCHANGE_OFFER);
    expect(llms).toContain("- [Entraide](/petites-missions):");
    expect(llms).toContain("Guardiens est gratuit");
  });

  it("le bloc des villes suit la règle et le format du générateur", () => {
    const block = llms.match(LLMS_ENTRAIDE_CITIES_RE)?.[0];
    expect(block).toBeTruthy();
    const slugs = [...block!.matchAll(/\(\/petites-missions\/([a-z-]+)\)/g)].map((m) => m[1]);
    expect(block).toBe(entraideCitiesLlmsBlock(new Set(slugs)));
    // État de la base au 25/10/2026 (besoins visibles déposés sur 90 jours, rayon 30 km).
    expect(slugs).toEqual(["lyon", "marseille", "paris", "annecy", "montpellier", "grenoble", "bordeaux"]);
    expect(block).toContain("autour d'Annecy");
  });

  it("aucun tiret cadratin ni demi-cadratin dans les fichiers du lot", () => {
    for (const p of [
      "public/llms.txt",
      "supabase/functions/_shared/entraideCityIndexability.js",
      "src/lib/entraideMissionLinks.ts",
      "drizzle/migrations/0101_seoe_activite_entraide_villes.sql",
    ]) expect(read(p)).not.toMatch(/[–—]/);
  });
});
