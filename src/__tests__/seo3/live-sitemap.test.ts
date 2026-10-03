import { describe, it, expect, vi } from "vitest";
import { collectSitemapData } from "../../../supabase/functions/_shared/sitemap-data.js";
import { createSitemapDocument, createLiveSitemapHandler, validateRoutesConfig } from "../../../supabase/functions/sitemap/live.js";
import { readFileSync } from "node:fs";
import { readRobotsConfig } from "../../../scripts/robots-lib.mjs";
import { readStaticCitySlugs } from "../../../scripts/lib/sitemapCore.mjs";

const config = { version: 1, siteUrl: "https://guardiens.fr", staticPages: [{ loc: "/", indexable: true, changefreq: "daily", priority: "1.0" }], cityLandingPages: ["lyon"] };
const empty = () => Object.fromEntries(["articles", "seoCity", "guides", "depts", "breeds", "profiles", "sits", "entraideMissions", "projetMissions", "associations"].map(k => [k, []]));
const xml = () => createSitemapDocument(config, empty()).xml;
const req = (method = "GET") => new Request("https://example.test/sitemap", { method });

// Execute les filtres de lecture publics et les vrais criteres partages,
// puis modifie les sources sans build, migration ou manipulation de membre.
function collector(tables: Record<string, any[]>, today: Date) {
  return collectSitemapData({ today, maxUpdatedAtWithCount: () => null,
    fetchOrCache: async (_key: string, _cache: object, _probe: unknown, fetcher: () => Promise<any[]>, builder: (rows: any[]) => any[]) => builder(await fetcher()),
    readAll: async (_source: string, table: string, _columns: string, _key: string, build?: (q: any) => any) => {
      let rows = [...(tables[table] || [])];
      const q = {
        eq: (k: string, v: unknown) => { rows = rows.filter(r => r[k] === v); return q; },
        neq: (k: string, v: unknown) => { rows = rows.filter(r => r[k] !== v); return q; },
        in: (k: string, values: unknown[]) => { rows = rows.filter(r => values.includes(r[k])); return q; },
        not: (k: string, _op: string, v: unknown) => { rows = rows.filter(r => r[k] !== v); return q; },
        or: (_filter: string) => { rows = rows.filter(r => r.noindex !== true); return q; },
      };
      build?.(q);
      return rows;
    },
  });
}

describe("sitemap actuel sans nouvelle publication", () => {
  it("retire suppression, depublication et noindex a la lecture suivante", async () => {
    const tables = { articles: [{ id: "a", slug: "article", published: true }], seo_city_pages: [{ id: "c", slug: "paris", published: true, noindex: false }], seo_department_pages: [{ id: "d", slug: "rhone", published: true, noindex: false }] };
    const today = new Date("2026-10-03T12:00:00Z");
    expect(createSitemapDocument(config, await collector(tables, today), today).locs).toEqual(expect.arrayContaining(["/actualites/article", "/house-sitting/paris", "/departement/rhone"]));
    tables.articles = []; tables.seo_city_pages[0].published = false; tables.seo_department_pages[0].noindex = true;
    const document = createSitemapDocument(config, await collector(tables, today), today);
    expect(document.locs).toEqual(["/", "/house-sitting/lyon"]);
  });
  it("suit ancien slug, categorie projet et expiration sans changement du frontend", async () => {
    const today = new Date("2026-10-03T12:00:00Z");
    const mission = { id: "m", slug: "ancienne", status: "open", category: "garden", mission_type: "besoin", description: "a".repeat(200), end_date: "2026-10-04" };
    const tables = { public_small_missions: [mission] };
    expect(createSitemapDocument(config, await collector(tables, today), today).locs).toContain("/petites-missions/ancienne");
    mission.slug = "nouvelle"; mission.category = "projet";
    const changed = createSitemapDocument(config, await collector(tables, today), today).locs;
    expect(changed).toContain("/projets/nouvelle"); expect(changed).not.toContain("/petites-missions/ancienne");
    const later = new Date("2026-10-05T12:00:00Z");
    expect(createSitemapDocument(config, await collector(tables, later), later).locs).not.toContain("/projets/nouvelle");
  });
  it("ecarte role proprietaire et texte masque, puis suit la perte de confiance", async () => {
    const tables = { public_profiles: [{ id: "owner", role: "owner", bio: "a".repeat(100), identity_verified: true }, { id: "sitter", role: "sitter", bio: "a".repeat(80), identity_verified: true }, { id: "contact", role: "sitter", bio: "Bonjour https://example.test/" + "a".repeat(100), identity_verified: true }] };
    const today = new Date("2026-10-03T12:00:00Z");
    const locs = createSitemapDocument(config, await collector(tables, today), today).locs;
    expect(locs).toContain("/gardiens/sitter"); expect(locs).not.toContain("/gardiens/owner"); expect(locs).not.toContain("/gardiens/contact");
    tables.public_profiles[1].identity_verified = false;
    expect(createSitemapDocument(config, await collector(tables, today), today).locs).not.toContain("/gardiens/sitter");
  });
  it("partage les routes compilees et annonce le endpoint public dans robots", () => {
    const inventory = JSON.parse(readFileSync("public/sitemap-routes.json", "utf8"));
    expect(inventory.cityLandingPages).toEqual(readStaticCitySlugs(readFileSync("src/data/cities.ts", "utf8")));
    expect(readRobotsConfig(readFileSync("src/data/siteRoutes.ts", "utf8")).sitemapUrl).toBe("https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/sitemap");
    for (const path of ["scripts/generate-sitemap.mjs", "supabase/functions/sitemap/index.ts"]) expect(readFileSync(path, "utf8")).toContain("collectSitemapData");
    expect(validateRoutesConfig(inventory)).toBe(inventory);
  });
  it("refuse inventaire incomplet, domaine et chemins etrangers et source partielle", () => {
    expect(() => validateRoutesConfig({ ...config, siteUrl: "https://elsewhere.test" })).toThrow();
    expect(() => validateRoutesConfig({ ...config, staticPages: [] })).toThrow();
    expect(() => createSitemapDocument(config, { ...empty(), articles: [{ loc: "//elsewhere.test/x" }] })).toThrow();
    expect(() => createSitemapDocument(config, { ...empty(), articles: undefined })).toThrow();
  });
  it("relit sous 60 secondes, partage les acces concurrents et sert HEAD sans corps", async () => {
    let clock = Date.parse("2026-10-03T12:00:00Z");
    const generate = vi.fn().mockImplementation(async () => xml());
    const handler = createLiveSitemapHandler({ generate, now: () => clock });
    const results = await Promise.all([handler(req()), handler(req()), handler(req("HEAD"))]);
    expect(generate).toHaveBeenCalledTimes(1); expect(await results[2].text()).toBe("");
    expect(results[0].headers.get("Cache-Control")).toBe("no-store");
    clock += 59_999; await handler(req()); expect(generate).toHaveBeenCalledTimes(1);
    clock += 1; await handler(req()); expect(generate).toHaveBeenCalledTimes(2);
  });
  it("une panne apres expiration rend 503 puis reessaie, sans XML ancien ou partiel", async () => {
    let clock = Date.parse("2026-10-03T12:00:00Z");
    const generate = vi.fn().mockResolvedValueOnce(xml()).mockRejectedValueOnce(new Error("source unavailable")).mockResolvedValueOnce(xml());
    const handler = createLiveSitemapHandler({ generate, now: () => clock });
    expect((await handler(req())).status).toBe(200); clock += 60_000;
    const failure = await handler(req()); expect(failure.status).toBe(503); expect(await failure.text()).not.toContain("<urlset");
    expect(failure.headers.get("Retry-After")).toBe("60"); expect((await handler(req())).status).toBe(200);
  });
  it("refuse methode et XML incorrect sans retourner 200", async () => {
    const generate = vi.fn().mockResolvedValue("<html>not a sitemap</html>");
    const handler = createLiveSitemapHandler({ generate });
    expect((await handler(req("POST"))).status).toBe(405); expect(generate).not.toHaveBeenCalled();
    expect((await handler(req())).status).toBe(503);
  });
});
