// Lot LM1 (12/11/2026) : le sitemap donne une date lastmod fiable aux pages
// ville. La date vient de content_updated_at, posée par le déclencheur de la
// migration 0142 quand le contenu ou l'état d'indexation change, jamais sur
// un recalcul de compteurs.
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { collectSitemapData } from "../../../supabase/functions/_shared/sitemap-data.js";
import { createSitemapDocument } from "../../../supabase/functions/sitemap/live.js";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const MIGRATION = "drizzle/migrations/0142_lm1_date_contenu_pages_villes.sql";

describe("LM1, migration 0142 : date de contenu des pages ville", () => {
  let db: PGlite;
  const dateOf = async (slug: string) =>
    (await db.query<{ d: string | null }>("SELECT content_updated_at::text AS d FROM seo_city_pages WHERE slug = $1", [slug])).rows[0].d;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE public.seo_city_pages (
        id serial PRIMARY KEY, slug text, city text, h1_title text, intro_text text, content text,
        excerpt text, meta_title text, meta_description text, cover_image_url text, hero_image_alt text,
        canonical_url text, published boolean, noindex boolean, sitter_count integer,
        active_sits_count integer, nearby_sitter_count integer, seo_dirty_at timestamptz,
        updated_at timestamptz DEFAULT now()
      );
      INSERT INTO public.seo_city_pages (slug, city, content, published, noindex, sitter_count)
      VALUES ('ancienne', 'Ancienne', 'texte', true, true, 0);
    `);
    await db.exec(read(MIGRATION));
  });

  it("une ligne existante garde une date vide : aucun lastmod inventé", async () => {
    expect(await dateOf("ancienne")).toBeNull();
  });

  it("un recalcul de compteurs laisse la date intacte", async () => {
    await db.exec("UPDATE seo_city_pages SET sitter_count = 3, active_sits_count = 1, nearby_sitter_count = 12, seo_dirty_at = now(), updated_at = now() WHERE slug = 'ancienne'");
    expect(await dateOf("ancienne")).toBeNull();
  });

  it("le retour dans l'index pose la date", async () => {
    await db.exec("UPDATE seo_city_pages SET noindex = false WHERE slug = 'ancienne'");
    expect(await dateOf("ancienne")).not.toBeNull();
  });

  it("un changement de texte, de meta ou d'image avance la date", async () => {
    for (const col of ["content", "intro_text", "h1_title", "meta_title", "meta_description", "cover_image_url"]) {
      await db.exec("UPDATE seo_city_pages SET content_updated_at = '2026-01-01T00:00:00Z' WHERE slug = 'ancienne'");
      await db.exec(`UPDATE seo_city_pages SET ${col} = 'nouveau ${col}' WHERE slug = 'ancienne'`);
      expect((await dateOf("ancienne"))!.startsWith("2026-01-01"), col).toBe(false);
    }
  });

  it("une écriture identique laisse la date intacte", async () => {
    await db.exec("UPDATE seo_city_pages SET content_updated_at = '2026-01-01T00:00:00Z' WHERE slug = 'ancienne'");
    await db.exec("UPDATE seo_city_pages SET content = content, noindex = false, published = true WHERE slug = 'ancienne'");
    expect((await dateOf("ancienne"))!.startsWith("2026-01-01")).toBe(true);
  });

  it("une page créée reçoit sa date de création", async () => {
    await db.exec("INSERT INTO seo_city_pages (slug, city, published, noindex) VALUES ('nouvelle', 'Nouvelle', true, false)");
    expect(await dateOf("nouvelle")).not.toBeNull();
  });

  it("la migration se rejoue sans erreur et garde les dates", async () => {
    const before = await dateOf("nouvelle");
    await db.exec(read(MIGRATION));
    expect(await dateOf("nouvelle")).toBe(before);
  });
});

describe("LM1, sitemap : lastmod des pages ville", () => {
  const config = { version: 1, siteUrl: "https://guardiens.fr", staticPages: [{ loc: "/", indexable: true, changefreq: "daily", priority: "1.0" }], cityLandingPages: ["lyon"] };
  const today = new Date("2026-11-12T12:00:00Z");
  const collect = (cities: any[]) => collectSitemapData({
    today, cache: {}, maxUpdatedAtWithCount: () => null,
    fetchOrCache: async (_k: string, _c: object, _p: unknown, fetcher: () => Promise<any[]>, builder: (rows: any[]) => any[]) => builder(await fetcher()),
    readAll: async (_source: string, table: string) => (table === "seo_city_pages" ? cities : []),
  });
  const entry = async (row: any) => {
    const doc = createSitemapDocument(config, await collect([{ id: "c", published: true, noindex: false, department: "Rhône", ...row }]), today);
    return { entry: doc.entries.find((e: any) => e.loc === `/house-sitting/${row.slug}`), xml: doc.xml };
  };

  it("une date de contenu devient le lastmod de la page", async () => {
    const { entry: e, xml } = await entry({ slug: "versailles", content_updated_at: "2026-11-10T08:15:00+00:00" });
    expect(e.lastmod).toBe("2026-11-10");
    expect(xml).toContain("<loc>https://guardiens.fr/house-sitting/versailles</loc>\n    <lastmod>2026-11-10</lastmod>");
  });

  it("sans date de contenu, lastmod est omis", async () => {
    const { entry: e } = await entry({ slug: "brest", content_updated_at: null, updated_at: "2026-11-11T04:00:00Z" });
    expect(e.lastmod).toBeNull();
  });

  it("une date dans le futur est écartée", async () => {
    const { entry: e } = await entry({ slug: "orleans", content_updated_at: "2026-12-01T00:00:00Z" });
    expect(e.lastmod).toBeNull();
  });

  it("une ville de l'inventaire statique prend la date de sa ligne en base", async () => {
    const { entry: e } = await entry({ slug: "lyon", content_updated_at: "2026-11-09T10:00:00Z" });
    expect(e.lastmod).toBe("2026-11-09");
  });
});

describe("LM1, câblage", () => {
  const data = read("supabase/functions/_shared/sitemap-data.js");

  it("la lecture des pages ville demande content_updated_at et l'emploie pour lastmod", () => {
    expect(data).toMatch(/readAll\("seo_city_pages", "seo_city_pages", "id, slug, updated_at, content_updated_at"/);
    expect(data).toContain("lastmod: normalizeLastmod(cp.content_updated_at, today)");
    expect(data).toContain('"seo_city_pages_v2", cache,');
  });

  it("updated_at ne sert jamais de lastmod aux pages ville", () => {
    expect(data).not.toMatch(/lastmod: normalizeLastmod\(cp\.updated_at/);
  });

  it("la migration porte son contrat de production", () => {
    const manifest = JSON.parse(read("scripts/db/production-contracts.json"));
    const contract = manifest.contracts.find((c: any) => c.migration === "0142_lm1_date_contenu_pages_villes.sql");
    expect(contract?.checks.map((c: any) => c.name)).toEqual(["colonne_date_contenu", "fonction_date_contenu", "declencheur_date_contenu"]);
    expect(read(MIGRATION)).toContain("lm1_date_contenu_pages_villes");
  });
});
