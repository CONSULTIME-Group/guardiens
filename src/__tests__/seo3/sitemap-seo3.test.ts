import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error module JS sans types
import { fetchAllPages, supabasePage, normalizeLastmod, dedupeEntries, renderSitemapXml, validateSitemapXml, readStaticRoutes } from "../../../scripts/lib/sitemapCore.mjs";
// @ts-expect-error module JS sans types
import { fetchOrCache, normalizeCache, SITEMAP_CACHE_VERSION } from "../../../scripts/lib/sitemapCache.mjs";
import { proxySitemap, validateSitemapBody, STATIC_SITEMAP_ORIGIN } from "../../../supabase/functions/sitemap/proxy";

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id-${String(i).padStart(5, "0")}` }));

/** Faux client supabase-js : filtre, tri, range et count réels. */
function fakeClient(data: Record<string, any[]>, opts: { failAt?: number; repeat?: boolean } = {}) {
  const calls: any[] = [];
  return {
    calls,
    from(table: string) {
      const st: any = { filters: [] as ((r: any) => boolean)[] };
      const q: any = {
        select(_c: string, o?: { count: string }) { st.count = !!o; return q; },
        eq(k: string, v: any) { st.filters.push((r: any) => r[k] === v); return q; },
        order(k: string) { st.order = k; return q; },
        range(from: number, to: number) {
          calls.push({ table, from, to, order: st.order });
          const page = calls.filter((c) => c.table === table).length;
          if (opts.failAt === page) return Promise.resolve({ data: null, error: { message: "panne" } });
          let all = data[table].filter((r) => st.filters.every((f: any) => f(r)));
          all = [...all].sort((a, b) => (a[st.order] < b[st.order] ? -1 : 1));
          const start = opts.repeat && page > 1 ? 0 : from;
          return Promise.resolve({ data: all.slice(start, start + (to - from + 1)), error: null, count: st.count ? all.length : null });
        },
      };
      return q;
    },
  };
}

describe("SEO-3 pagination", () => {
  it("lit plus de 1000 lignes, triées sur la clé, avec range", async () => {
    const c = fakeClient({ t: rows(2500).reverse() });
    const out = await fetchAllPages({ source: "t", key: "id", page: supabasePage(c, "t", "id", "id") });
    expect(out).toHaveLength(2500);
    expect(new Set(out.map((r: any) => r.id)).size).toBe(2500);
    expect(c.calls.map((x) => [x.from, x.to, x.order])).toEqual([[0, 999, "id"], [1000, 1999, "id"], [2000, 2999, "id"]]);
  });

  it("pagine aussi les collections annexes filtrées (motivations, galeries)", async () => {
    const c = fakeClient({ g: rows(1500).map((r, i) => ({ user_id: r.id, ok: i % 3 !== 0 })) });
    const out = await fetchAllPages({ source: "g", key: "user_id", page: supabasePage(c, "g", "user_id", "user_id", (q: any) => q.eq("ok", true)) });
    expect(out).toHaveLength(1000);
    expect(c.calls).toHaveLength(2);
  });

  it("une erreur en page 2 fait échouer, sans résultat partiel", async () => {
    const c = fakeClient({ t: rows(1500) }, { failAt: 2 });
    await expect(fetchAllPages({ source: "t", key: "id", page: supabasePage(c, "t", "id", "id") })).rejects.toThrow(/page 2/);
  });

  it("une page répétée est détectée", async () => {
    const c = fakeClient({ t: rows(1500) }, { repeat: true });
    await expect(fetchAllPages({ source: "t", key: "id", page: supabasePage(c, "t", "id", "id") })).rejects.toThrow(/répétée/);
  });

  it("plafond de pages : une source qui ne s'arrête jamais est interrompue", async () => {
    let n = 0;
    const page = async () => ({ data: rows(10).map((r) => ({ id: `${r.id}-${n++}` })), error: null, count: 10 });
    await expect(fetchAllPages({ source: "t", key: "id", page, pageSize: 10 })).rejects.toThrow(/plafond|annoncées/);
  });

  it("un total incohérent est refusé, total absent aussi", async () => {
    await expect(fetchAllPages({ source: "t", key: "id", page: async () => ({ data: rows(3), error: null, count: 5 }) })).rejects.toThrow(/annoncées/);
    await expect(fetchAllPages({ source: "t", key: "id", page: async () => ({ data: rows(3), error: null }) })).rejects.toThrow(/total/);
  });
});

describe("SEO-3 cache v4 et sources sans sonde", () => {
  afterEach(() => vi.restoreAllMocks());

  it("un cache d'une autre version est ignoré", () => {
    expect(SITEMAP_CACHE_VERSION).toBe(4);
    const old = { version: 3, sources: { a: { head: "x" } }, entries: { a: [{ loc: "/vieux", lastmod: "2026-10-03" }] } };
    expect(normalizeCache(old).entries).toEqual({});
  });

  it("source sans sonde : relue à chaque fois, jamais mise en cache", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const cache = { version: 4, sources: { p: { head: "h" } }, entries: { p: ["ancien"] } };
    const fetcher = vi.fn().mockResolvedValue([1]);
    const out = await fetchOrCache("p", cache, null, fetcher, () => ["neuf"]);
    expect(out).toEqual(["neuf"]);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(cache.entries).not.toHaveProperty("p");
  });

  it("le générateur passe null pour profils, annonces et missions", () => {
    const src = readFileSync(resolve(process.cwd(), "scripts/generate-sitemap.mjs"), "utf8");
    for (const k of ["public_profiles", "public_sits", "small_missions_entraide_v1", "small_missions_projets_v1"]) {
      expect(src).toMatch(new RegExp(`"${k}", cache,\\s*(//[^\\n]*\\n\\s*)*null`));
    }
    expect(src).not.toMatch(/last_seen_at/);
    expect(src).not.toMatch(/\|\| today/);
    expect(src).not.toMatch(/\.limit\(\d{3,}\)/);
  });
});

describe("SEO-3 lastmod et déduplication", () => {
  const today = "2026-10-03";
  it("absent, valide, invalide, futur", () => {
    expect(normalizeLastmod(null, today)).toBeNull();
    expect(normalizeLastmod("", today)).toBeNull();
    expect(normalizeLastmod("2026-09-01T10:00:00Z", today)).toBe("2026-09-01");
    expect(normalizeLastmod("2026-02-30", today)).toBeNull();
    expect(normalizeLastmod("pas une date", today)).toBeNull();
    expect(normalizeLastmod("2026-10-04", today)).toBeNull();
  });

  it("la déduplication garde la vraie date plutôt qu'une absence statique", () => {
    const { entries } = dedupeEntries([
      { loc: "/house-sitting/lyon", lastmod: null, changefreq: "weekly", priority: "0.9" },
      { loc: "/house-sitting/lyon", lastmod: "2026-09-12", changefreq: "monthly", priority: "0.7" },
      { loc: "/house-sitting/lyon", lastmod: "2026-08-01", changefreq: "monthly", priority: "0.7" },
    ]);
    expect(entries).toEqual([{ loc: "/house-sitting/lyon", lastmod: "2026-09-12", changefreq: "weekly", priority: "0.9" }]);
  });

  it("lastmod omis dans le XML quand absent, validation stricte", () => {
    const xml = renderSitemapXml("https://guardiens.fr", [
      { loc: "/", lastmod: null, changefreq: "daily", priority: "1.0" },
      { loc: "/races/x", lastmod: "2026-09-01", changefreq: "monthly", priority: "0.6" },
    ]);
    expect(xml.match(/<lastmod>/g)).toHaveLength(1);
    expect(validateSitemapXml(xml, "https://guardiens.fr", today)).toEqual(["https://guardiens.fr/", "https://guardiens.fr/races/x"]);
    expect(() => validateSitemapXml(xml.replace("2026-09-01", "2027-01-01"), "https://guardiens.fr", today)).toThrow(/lastmod/);
    expect(() => validateSitemapXml(xml.replace("</urlset>", ""), "https://guardiens.fr", today)).toThrow();
  });

  it("routes statiques lues par l'arbre syntaxique, sans date", () => {
    const { siteUrl, routes } = readStaticRoutes(readFileSync(resolve(process.cwd(), "src/data/siteRoutes.ts"), "utf8"));
    expect(siteUrl).toBe("https://guardiens.fr");
    expect(routes.some((r: any) => r.loc === "/projets")).toBe(true);
    expect(routes.every((r: any) => !("lastmod" in r))).toBe(true);
  });
});

describe("SEO-3 proxy de la fonction sitemap", () => {
  const good = renderSitemapXml("https://guardiens.fr", [{ loc: "/", lastmod: null, changefreq: "daily", priority: "1.0" }]);

  it("relaie le fichier statique de l'origine, sans base ni domaine public", async () => {
    const f = vi.fn().mockResolvedValue(new Response(good, { status: 200 }));
    const res = await proxySitemap(f as any);
    expect(f.mock.calls[0][0]).toBe(STATIC_SITEMAP_ORIGIN);
    expect(STATIC_SITEMAP_ORIGIN).not.toContain("guardiens.fr");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<loc>https://guardiens.fr/</loc>");
    const src = readFileSync(resolve(process.cwd(), "supabase/functions/sitemap/index.ts"), "utf8");
    expect(src).not.toMatch(/createClient|supabase-js/);
  });

  it("503 sur statut amont, XML invalide, domaine étranger ou délai", async () => {
    expect((await proxySitemap((async () => new Response("x", { status: 302 })) as any)).status).toBe(503);
    expect((await proxySitemap((async () => new Response("<html/>", { status: 200 })) as any)).status).toBe(503);
    expect(validateSitemapBody(good.replace("https://guardiens.fr/", "https://ailleurs.com/")).ok).toBe(false);
    const abort = async () => { const e = new Error("a"); e.name = "AbortError"; throw e; };
    const res = await proxySitemap(abort as any);
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("délai");
  });
});
