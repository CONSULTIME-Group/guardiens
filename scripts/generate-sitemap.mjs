/**
 * Generates a static public/sitemap.xml at build time.
 * INCREMENTAL: caches per-source updated_at in .sitemap-cache.json
 * Re-fetches only sources whose head changed since last build.
 * Force full rebuild: SITEMAP_FORCE=1 node scripts/generate-sitemap.mjs
 *
 * Source unique de vérité pour les routes statiques : src/data/siteRoutes.ts
 * (staticRoutes + SITE_URL). Ne PAS redéclarer ces valeurs ici.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(__dirname, "../.sitemap-cache.json");
const FORCE = process.env.SITEMAP_FORCE === "1";

// ─── Source de vérité : src/data/siteRoutes.ts ───────────────────────
// Parser le fichier TS pour extraire SITE_URL + staticRoutes sans
// dépendance TS runtime. Toute modif des routes doit se faire là-bas.
function loadStaticRoutes() {
  const filePath = path.resolve(__dirname, "../src/data/siteRoutes.ts");
  const source = fs.readFileSync(filePath, "utf-8");

  const siteUrlMatch = source.match(/export\s+const\s+SITE_URL\s*=\s*["']([^"']+)["']/);
  if (!siteUrlMatch) throw new Error("SITE_URL introuvable dans siteRoutes.ts");
  const siteUrl = siteUrlMatch[1];

  const routes = [];
  const blockRe = /\{\s*path:\s*(["'])([^"']+)\1[\s\S]*?changeFreq:\s*(["'])(daily|weekly|monthly|yearly)\3[\s\S]*?\}/g;
  let m;
  while ((m = blockRe.exec(source)) !== null) {
    const block = m[0];
    const path_ = m[2];
    const changefreq = m[4];
    const priorityMatch = block.match(/sitemapPriority:\s*(["'])([^"']+)\1/);
    if (!priorityMatch) continue;
    routes.push({ loc: path_, priority: priorityMatch[2], changefreq });
  }
  if (routes.length === 0) throw new Error("Aucune route extraite de staticRoutes");
  return { siteUrl, routes };
}

const { siteUrl: SITE_URL, routes: STATIC_ROUTES } = loadStaticRoutes();

// Routes à exclure du sitemap : doit rester COHÉRENT avec robots.txt et la
// balise <meta robots> dans le code de chaque page.
//   - /login           : disallow (robots.txt) — pas dans sitemap
//   - /recherche       : disallow + noindex (SearchPage.tsx) — pas dans sitemap
// /inscription est volontairement INDEXABLE (page de conversion).
const SITEMAP_EXCLUDE = new Set(["/login", "/recherche"]);
const staticPages = STATIC_ROUTES.filter((r) => !SITEMAP_EXCLUDE.has(r.loc));

const cityLandingPages = [
  "annecy", "lyon", "grenoble", "caluire-et-cuire", "chambery", "aura",
];

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://erhccyqevdyevpyctsjj.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PRIORITY_MAP = {
  ville: "0.9",
  guide_race: "0.8",
  guide_local: "0.8",
  guide_lieu: "0.8",
  vie_locale: "0.7",
  guide_pratique: "0.6",
  conseil: "0.6",
  conseil_gardien: "0.6",
  conseil_proprio: "0.6",
  saisonnier: "0.6",
  temoignage: "0.6",
  actualite: "0.6",
  thematique: "0.6",
};

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${escapeXml(SITE_URL + loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function loadCache() {
  if (FORCE) return { sources: {}, entries: {} };
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return { sources: {}, entries: {} };
  }
}

function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {
    console.warn("⚠️ Failed to write sitemap cache:", e.message);
  }
}

/**
 * Returns the most recent updated_at for a table (head-only, fast).
 * Returns null on error so we fall back to refetching.
 */
async function maxUpdatedAt(table, column = "updated_at", filter = null) {
  let q = supabase.from(table).select(column).order(column, { ascending: false }).limit(1);
  if (filter) q = filter(q);
  const { data, error } = await q;
  if (error || !data?.[0]) return null;
  return data[0][column] || null;
}

async function fetchOrCache(key, cache, headProbe, fetcher, builder) {
  const head = await headProbe();
  const cached = cache.sources[key];
  if (!FORCE && cached && cached.head === head && cache.entries[key]) {
    console.log(`  ↳ ${key}: cached (${cache.entries[key].length} URLs)`);
    return cache.entries[key];
  }
  const rows = await fetcher();
  const entries = builder(rows || []);
  cache.sources[key] = { head, fetchedAt: new Date().toISOString() };
  cache.entries[key] = entries;
  console.log(`  ↳ ${key}: refreshed (${entries.length} URLs)`);
  return entries;
}

async function main() {
  const today = new Date().toISOString().split("T")[0];
  const cache = loadCache();

  const excludedSlugs = new Set([
    "guide-house-sitting-lyon", "guide-lieu-meilleurs-parcs-chiens-lyon",
    "house-sitting-aix-les-bains", "house-sitting-haute-savoie-annecy-megeve",
    "pet-sitting-chambery-savoie", "pet-sitting-clermont-ferrand",
    "pet-sitting-grenoble-chartreuse", "pet-sitting-lyon-ouest-lyonnais",
    "pet-sitting-saint-etienne-loire", "pet-sitting-valence-drome",
    "pet-sitting-venissieux", "pet-sitting-villeurbanne",
    "pet-sitting-lyon-guide-complet", "pet-sitting-annecy-guide",
    "pet-sitting-grenoble-guide", "pet-sitting-clermont-ferrand-guide",
    "house-sitting-saint-etienne-guide", "border-collie-lyon-guide-race",
    "bouledogue-francais-lyon-guide-race", "malinois-lyon-guide-race",
    "golden-retriever-lyon-guide-race", "berger-australien-guide",
    "conseil-gardien-creer-profil-attractif-lyon", "preparer-maison-avant-vacances",
    "garde-chien-lyon-solutions",
    "boom-pet-sitting-lyon-2026",
  ]);

  console.log("🗺️  Sitemap incremental build…");

  const [articles, seoCity, guides, depts, breeds, profiles] = await Promise.all([
    fetchOrCache(
      "articles", cache,
      () => maxUpdatedAt("articles", "updated_at", q => q.eq("published", true)),
      async () => (await supabase.from("articles").select("slug, category, updated_at, published_at").eq("published", true).or("noindex.is.null,noindex.eq.false")).data,
      rows => rows.filter(a => !excludedSlugs.has(a.slug)).map(a => ({
        loc: `/actualites/${a.slug}`,
        lastmod: (a.updated_at || a.published_at || today).split("T")[0],
        changefreq: "monthly",
        priority: PRIORITY_MAP[a.category] || "0.7",
      }))
    ),
    fetchOrCache(
      "seo_city_pages", cache,
      () => maxUpdatedAt("seo_city_pages", "updated_at", q => q.eq("published", true)),
      async () => (await supabase.from("seo_city_pages").select("slug, updated_at").eq("published", true)).data,
      rows => rows.map(cp => ({
        loc: `/house-sitting/${cp.slug}`,
        lastmod: (cp.updated_at || today).split("T")[0],
        changefreq: "weekly",
        priority: "0.8",
      }))
    ),
    fetchOrCache(
      "city_guides", cache,
      () => maxUpdatedAt("city_guides", "updated_at", q => q.eq("published", true)),
      async () => (await supabase.from("city_guides").select("slug, updated_at").eq("published", true)).data,
      rows => rows.map(cg => ({
        loc: `/guides/${cg.slug}`,
        lastmod: (cg.updated_at || today).split("T")[0],
        changefreq: "weekly",
        priority: "0.7",
      }))
    ),
    fetchOrCache(
      "seo_department_pages", cache,
      () => maxUpdatedAt("seo_department_pages", "updated_at", q => q.eq("published", true)),
      async () => (await supabase.from("seo_department_pages").select("slug, updated_at").eq("published", true)).data,
      rows => rows.map(dp => ({
        loc: `/departement/${dp.slug}`,
        lastmod: (dp.updated_at || today).split("T")[0],
        changefreq: "weekly",
        priority: "0.8",
      }))
    ),
    fetchOrCache(
      "breed_profiles", cache,
      () => maxUpdatedAt("breed_profiles", "generated_at"),
      async () => (await supabase.from("breed_profiles").select("breed, species, generated_at")).data,
      rows => rows.map(bp => ({
        loc: `/races/${bp.species.toLowerCase()}-${bp.breed.toLowerCase().replace(/\s+/g, "-")}`,
        lastmod: (bp.generated_at || today).split("T")[0],
        changefreq: "monthly",
        priority: "0.6",
      }))
    ),
    fetchOrCache(
      "public_profiles", cache,
      () => maxUpdatedAt("profiles", "updated_at", q => q.eq("account_status", "active").gte("profile_completion", 60).in("role", ["sitter", "both"])),
      async () => (await supabase.from("profiles").select("id, updated_at, postal_code, avatar_url, bio, role").eq("account_status", "active").gte("profile_completion", 60).in("role", ["sitter", "both"]).not("postal_code", "is", null).not("avatar_url", "is", null).not("bio", "is", null).limit(1000)).data,
      rows => rows.filter(p => p.postal_code?.length === 5 && p.avatar_url && p.bio && p.bio.length > 50).map(p => ({
        loc: `/gardiens/${p.id}`,
        lastmod: (p.updated_at || today).split("T")[0],
        changefreq: "monthly",
        priority: "0.5",
      }))
    ),
  ]);

  const entries = [];

  for (const page of staticPages) {
    entries.push(urlEntry(page.loc, today, page.changefreq, page.priority));
  }
  for (const slug of cityLandingPages) {
    entries.push(urlEntry(`/house-sitting/${slug}`, today, "weekly", "0.9"));
  }
  for (const e of articles) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of seoCity) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of guides) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of depts) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of breeds) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of profiles) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  // Pages légales (/cgu, /confidentialite, /mentions-legales) déjà incluses
  // dans staticPages via staticRoutes — ne pas les ré-ajouter ici.

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  const outPath = path.resolve(__dirname, "../public/sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf-8");
  saveCache(cache);

  console.log(`\n✅ Sitemap generated: ${entries.length} URLs → ${outPath}`);
  console.log(`   Cache: ${CACHE_PATH}${FORCE ? " (forced)" : ""}`);
}

main().catch((err) => {
  console.error("❌ Sitemap generation failed:", err);
  process.exit(1);
});
