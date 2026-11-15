import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { aggregatePages } from "@/lib/admin/seoMetrics";
import {
  isBrandQuery,
  nonBrandClicks,
  pageTemplate,
  positionDelta,
  readLandingOutcomes,
  sitemapPaths,
  strikingQueries,
  templateTable,
} from "@/lib/admin/seoPilot";

const read = (p: string) => readFileSync(p, "utf8");

describe("SEO-B, type de page (même règle que seob_page_template)", () => {
  it.each([
    ["https://guardiens.fr/", "accueil"],
    ["/actualites/c-est-quoi-le-house-sitting#prix", "articles"],
    ["/house-sitting/lyon", "villes"],
    ["/house-sitting", "autres"],
    ["/departement/haute-savoie", "departements"],
    ["/races/dog-whippet", "races"],
    ["/guides/villefranche-sur-saone", "guides"],
    ["/associations/le-repere", "associations"],
    ["/gardiens/abc", "fiches_gardien"],
    ["/annonces/garde-de-chat-x", "annonces"],
    ["/petites-missions/lyon", "entraide"],
    ["/gardiennage-maison-quebec", "autres"],
  ])("%s → %s", (path, t) => {
    expect(pageTemplate(path)).toBe(t);
  });

  it("la migration porte les mêmes préfixes", () => {
    const sql = read("drizzle/migrations/0172_seob_arrivees.sql");
    for (const p of ["/actualites/", "/house-sitting/", "/departement/", "/races/", "/guides/", "/associations/", "/gardiens/", "/annonces/", "/petites-missions/"]) {
      expect(sql).toContain(`'${p}_%'`);
    }
    expect(sql).toContain("Repère : seob_arrivees");
  });
});

describe("SEO-B, où Google nous voit", () => {
  const xml = `<urlset><url><loc>https://guardiens.fr/</loc></url><url><loc>https://guardiens.fr/house-sitting/lyon</loc></url><url><loc>https://guardiens.fr/house-sitting/brest</loc></url><url><loc>https://guardiens.fr/gardiens/a</loc></url></urlset>`;
  it("lit le sitemap", () => {
    expect(sitemapPaths(xml)).toEqual(["/", "/house-sitting/lyon", "/house-sitting/brest", "/gardiens/a"]);
  });
  it("compte vues, impressions et pages jamais vues par type", () => {
    const totals = aggregatePages([
      { page: "https://guardiens.fr/", impressions: 100, clicks: 2 },
      { page: "https://guardiens.fr/house-sitting/lyon", impressions: 40, clicks: 1 },
      { page: "https://guardiens.fr/house-sitting/lyon#faq", impressions: 10, clicks: 0 },
      { page: "https://guardiens.fr/house-sitting/hors-sitemap", impressions: 5, clicks: 0 },
    ]);
    const rows = templateTable(sitemapPaths(xml), totals);
    const villes = rows.find((r) => r.template === "villes")!;
    expect(villes).toMatchObject({ inSitemap: 2, seen: 2, impressions: 55, clicks: 1, unseen: ["/house-sitting/brest"] });
    expect(rows.find((r) => r.template === "fiches_gardien")).toMatchObject({ inSitemap: 1, seen: 0, unseen: ["/gardiens/a"] });
    expect(rows[0].template).toBe("accueil");
  });
});

describe("SEO-B, marque et requêtes à portée", () => {
  it("reconnaît la marque", () => {
    for (const q of ["guardiens", "guardiens.fr", "Guardien", "guardians lyon"]) expect(isBrandQuery(q)).toBe(q !== "guardians lyon");
    expect(isBrandQuery("house sitting")).toBe(false);
  });
  it("clics hors marque = total moins marque", () => {
    expect(nonBrandClicks(482, [
      { query: "guardiens.fr", clicks: 5, impressions: 6, position: 1 },
      { query: "guardiens", clicks: 2, impressions: 6, position: 2 },
      { query: "house sitting", clicks: 17, impressions: 1341, position: 7.6 },
    ])).toBe(475);
  });
  it("garde la zone 5 à 20, 100 impressions, hors marque, avec la page qui ressort", () => {
    const rows = strikingQueries([
      { query: "house sitting", clicks: 17, impressions: 1341, position: 7.6 },
      { query: "garde maison et animaux", clicks: 2, impressions: 140, position: 21.6 },
      { query: "house sitting en français", clicks: 3, impressions: 41, position: 3.5 },
      { query: "guardiens avis", clicks: 1, impressions: 200, position: 6 },
      { query: "berger créole", clicks: 3, impressions: 529, position: 11.3 },
    ], { "house sitting": "https://guardiens.fr/actualites/c-est-quoi-le-house-sitting#prix" });
    expect(rows.map((r) => r.query)).toEqual(["house sitting", "berger créole"]);
    expect(rows[0].page).toBe("/actualites/c-est-quoi-le-house-sitting");
    expect(rows[1].page).toBeNull();
  });
  it("écart de position en places", () => {
    expect(positionDelta(18.2, 15.6)).toBe(2.6);
    expect(positionDelta(18.2, 0)).toBeNull();
  });
});

describe("SEO-B, arrivées", () => {
  it("lecture tolérante de admin_landing_outcomes", () => {
    const r = readLandingOutcomes({ templates: [{ template: "villes", visits: 12, signups: "2", published_members: 0 }, { template: "inconnu" }], pages: [{ path: "/house-sitting/lyon", visits: 3, signups: 1 }] });
    expect(r.templates[0]).toEqual({ template: "villes", visits: 12, signups: 2, published_members: 0 });
    expect(r.templates[1].template).toBe("autres");
    expect(r.pages[0]).toEqual({ path: "/house-sitting/lyon", visits: 3, signups: 1, published_members: 0 });
    expect(readLandingOutcomes(null)).toEqual({ templates: [], pages: [] });
  });
});

describe("SEO-B, écran", () => {
  const seo = read("src/pages/admin/AdminSEO.tsx");
  it("ordre : Google, types de page, arrivées Google, requêtes à portée, actions, IA, outils repliés", () => {
    const order = ["<SeoGoogleKpis", "<SeoTemplatesCard", 'channel="recherche_naturelle"', "<StrikingQueriesCard", "<PriorityActions", 'data-testid="seo-ai"', 'channel="ia"', 'data-testid="seo-tools"'];
    const idx = order.map((k) => seo.indexOf(k));
    idx.forEach((i) => expect(i).toBeGreaterThan(-1));
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });
  it("Bing, IndexNow et GA4 vivent dans les outils repliés", () => {
    const tools = seo.slice(seo.indexOf('data-testid="seo-tools"'));
    for (const k of ["<BingKpiRow", "<BingVisibilityCard", "<IndexNowPanel", "<UrlInspectionCard", "{extraTools}"]) expect(tools).toContain(k);
    expect(read("src/pages/admin/AdminTraffic.tsx")).toContain("<AdminSEO extraTools={<SeoSynthesis />} />");
  });
  it("« Contenu à créer » quitte l'onglet, « Pilotage acquisition » rejoint Leads", () => {
    expect(seo).not.toContain("ContentToCreate");
    expect(seo).not.toContain("AcquisitionPilotCard");
    const traffic = read("src/pages/admin/AdminTraffic.tsx");
    expect(traffic.indexOf("<AcquisitionPilotCard />")).toBeGreaterThan(traffic.indexOf('<TabsContent value="leads"'));
    expect(traffic.indexOf("<AcquisitionPilotCard />")).toBeLessThan(traffic.indexOf('<TabsContent value="entonnoir"'));
  });
  it("fetch-seo-data lit toutes les requêtes et la page qui ressort", () => {
    const fn = read("supabase/functions/fetch-seo-data/index.ts");
    expect(fn).toContain('dimensions: ["query", "page"]');
    expect(fn).toContain("allQueries:");
    expect(fn).toContain("queryTopPages:");
  });
});
