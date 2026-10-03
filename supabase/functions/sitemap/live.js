import { dedupeEntries, normalizeLastmod, renderSitemapXml, validateSitemapXml } from "../_shared/sitemap-core.js";

export const ROUTES_ORIGIN = "https://guardiens.lovable.app/sitemap-routes.json";
const SITE = "https://guardiens.fr";

export function validateRoutesConfig(config) {
  if (config?.version !== 1 || config.siteUrl !== SITE || !Array.isArray(config.staticPages) || !Array.isArray(config.cityLandingPages)) {
    throw new Error("Invalid sitemap route inventory");
  }
  if (!config.staticPages.some(p => p.loc === "/") || !config.cityLandingPages.length) throw new Error("Incomplete sitemap route inventory");
  for (const page of config.staticPages) {
    if (page.indexable !== true || !/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(page.loc) || !/^(daily|weekly|monthly|yearly)$/.test(page.changefreq) || !/^(0(?:\.\d+)?|1(?:\.0+)?)$/.test(page.priority)) {
      throw new Error("Invalid static sitemap route");
    }
  }
  for (const slug of config.cityLandingPages) if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid static city slug");
  return config;
}

export function createSitemapDocument(config, collections, today = new Date()) {
  validateRoutesConfig(config);
  const raw = config.staticPages.map(page => ({ loc: page.loc, lastmod: null, changefreq: page.changefreq, priority: page.priority }));
  for (const slug of config.cityLandingPages) raw.push({ loc: `/house-sitting/${slug}`, lastmod: null, changefreq: "weekly", priority: "0.9" });
  for (const key of ["articles", "seoCity", "guides", "depts", "breeds", "profiles", "sits", "entraideMissions", "projetMissions", "associations"]) {
    if (!Array.isArray(collections[key])) throw new Error(`Missing sitemap source: ${key}`);
    for (const entry of collections[key]) {
      if (!/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(entry.loc)) throw new Error(`Invalid sitemap path: ${key}`);
      raw.push({ loc: entry.loc, lastmod: normalizeLastmod(entry.lastmod, today), changefreq: entry.changefreq, priority: entry.priority });
    }
  }
  const { entries, dupes } = dedupeEntries(raw);
  if (entries.length > 50_000) throw new Error("Sitemap requires an index: URL limit reached");
  const xml = renderSitemapXml(config.siteUrl, entries);
  if (new TextEncoder().encode(xml).byteLength > 50 * 1024 * 1024) throw new Error("Sitemap size limit reached");
  const locs = validateSitemapXml(xml, config.siteUrl, today).map(loc => loc.slice(config.siteUrl.length));
  return { xml, entries, locs, dupes };
}

// Une instance partage les lectures concurrentes. Un resultat expire ne masque
// jamais une panne ou une source partielle. Les modifications arrivent sous 60 s.
export function createLiveSitemapHandler({ generate, now = Date.now, ttlMs = 60_000 }) {
  let cached = null;
  let inFlight = null;
  return async function handler(req) {
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    try {
      if (!cached || now() - cached.at >= ttlMs) {
        if (!inFlight) {
          inFlight = Promise.resolve().then(generate).then(xml => {
            validateSitemapXml(xml, SITE, new Date(now()));
            cached = { xml, at: now() };
          }).finally(() => { inFlight = null; });
        }
        await inFlight;
      }
      return new Response(req.method === "HEAD" ? null : cached.xml, { status: 200, headers: {
        "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store",
        "X-Sitemap-Generated-At": new Date(cached.at).toISOString(), "Access-Control-Allow-Origin": "*",
      } });
    } catch (error) {
      console.error("[sitemap] generation failed", error instanceof Error ? error.message : "unknown error");
      return new Response(req.method === "HEAD" ? null : "Sitemap temporarily unavailable", { status: 503, headers: {
        "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60",
      } });
    }
  };
}
