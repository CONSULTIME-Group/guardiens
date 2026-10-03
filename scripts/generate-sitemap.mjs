/**
 * Generates a static public/sitemap.xml at build time.
 * INCREMENTAL: caches per-source updated_at in .sitemap-cache.json
 * Re-fetches only sources whose head changed since last build.
 * Force full rebuild: SITEMAP_FORCE=1 node scripts/generate-sitemap.mjs
 *
 * Source unique de vérité pour les routes statiques : src/data/siteRoutes.ts
 * (staticRoutes + SITE_URL). Ne PAS redéclarer ces valeurs ici.
 *
 * Dernière régénération forcée : 2026-09-06 (sortie de noindex de 20 pages villes)
 */
import { createClient } from "@supabase/supabase-js";
import { createSitemapDocument } from "../supabase/functions/sitemap/live.js";
import { collectSitemapData } from "../supabase/functions/_shared/sitemap-data.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchOrCache as sharedFetchOrCache, normalizeCache, emptyCache } from "./lib/sitemapCache.mjs";
import { probeCompositeKey, fetchAllPages, supabasePage, readStaticRoutes, readStaticCitySlugs } from "./lib/sitemapCore.mjs";



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(__dirname, "../.sitemap-cache.json");
const FORCE = process.env.SITEMAP_FORCE === "1";

// ─── Source de vérité : src/data/siteRoutes.ts ───────────────────────
// Lecture par l'arbre syntaxique TypeScript (scripts/lib/sitemapCore.mjs).
function loadStaticRoutes() {
  const filePath = path.resolve(__dirname, "../src/data/siteRoutes.ts");
  return readStaticRoutes(fs.readFileSync(filePath, "utf-8"));
}

const { siteUrl: SITE_URL, routes: STATIC_ROUTES } = loadStaticRoutes();

// Filtrage automatique : on ne garde que les routes marquées indexables.
// Pas de SITEMAP_EXCLUDE en doublon, la décision est prise dans siteRoutes.ts
// via le flag `index`. Toute incohérence est impossible par construction.
const staticPages = STATIC_ROUTES.filter((r) => r.indexable);

// Villes "statiques" (src/data/cities.ts) : pages riches garanties, toujours servies.
// Ne jamais ajouter un slug sans page réelle : toute entrée doit être servie par
// CityPage (CITIES) ou exister en seo_city_pages, sinon elle part en 404.
const cityLandingPages = readStaticCitySlugs(fs.readFileSync(path.resolve(__dirname, "../src/data/cities.ts"), "utf-8"));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://erhccyqevdyevpyctsjj.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Lecture paginée intégrale d'une source publique (voir sitemapCore). */
function readAll(source, table, columns, key, build) {
  return fetchAllPages({ source, key, page: supabasePage(supabase, table, columns, key, build) });
}

function loadCache() {
  if (FORCE) return emptyCache();
  try {
    return normalizeCache(JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")));
  } catch {
    return emptyCache();
  }
}

function writeAtomic(target, content) {
  const tmp = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content, "utf-8");
  fs.renameSync(tmp, target);
}

function saveCache(cache) {
  writeAtomic(CACHE_PATH, JSON.stringify(cache, null, 2));
}

/** Clé composite date|nombre, null si l'une des deux sondes échoue (sitemapCore). */
function maxUpdatedAtWithCount(table, column, filter = null) {
  return probeCompositeKey(supabase, table, column, filter);
}

// Source de vérité unique du cache : scripts/lib/sitemapCache.mjs.
function fetchOrCache(key, cache, headProbe, fetcher, builder) {
  return sharedFetchOrCache(key, cache, headProbe, fetcher, builder, FORCE);
}


async function main() {
  // Référence d'heure unique capturée au début du build (bornage des dates futures).
  const buildNow = new Date();
  const today = buildNow;
  const cache = loadCache();

  const collections = await collectSitemapData({ readAll, fetchOrCache, maxUpdatedAtWithCount, cache, today });
  const { associations } = collections;

  const routeConfig = { version: 1, siteUrl: SITE_URL, staticPages, cityLandingPages };
  const { xml, entries, locs } = createSitemapDocument(routeConfig, collections, today);

  // llms.txt : compteurs calculés depuis le sitemap, préparés AVANT toute écriture.
  const cityCount = locs.filter((l) => /^\/house-sitting\/[^/]+$/.test(l)).length;
  const deptCount = locs.filter((l) => /^\/departement\/[^/]+$/.test(l)).length;
  const llmsPath = path.resolve(__dirname, "../public/llms.txt");
  let llms = null;
  if (fs.existsSync(llmsPath)) {
    llms = fs.readFileSync(llmsPath, "utf-8")
      .replace(
        /^(- \[House-sitting par ville\]\(\/house-sitting\): .*?)\d+ villes couvertes\.$/m,
        `$1${cityCount} villes couvertes.`,
      )
      .replace(
        /^(- \[House-sitting par département\]\(\/departement\): .*?)\d+ départements couverts\.$/m,
        `$1${deptCount} départements couverts.`,
      );
    const assocLines = associations
      .map(a => `- [${a._name}](${a.loc}) : ${a._summary}, ${a._city} (${a._dept}).`)
      .join("\n");
    const assocBlock = `<!-- associations:start -->\n## Associations et refuges\n\n${assocLines}\n<!-- associations:end -->`;
    llms = /<!-- associations:start -->[\s\S]*?<!-- associations:end -->/.test(llms)
      ? llms.replace(/<!-- associations:start -->[\s\S]*?<!-- associations:end -->/, assocBlock)
      : `${llms.trimEnd()}\n\n${assocBlock}\n`;
  }

  // Écritures seulement ici, toutes les lectures ayant réussi.
  const outPath = path.resolve(__dirname, "../public/sitemap.xml");
  writeAtomic(outPath, xml);
  writeAtomic(path.resolve(__dirname, "../public/sitemap-routes.json"), JSON.stringify(routeConfig));
  if (llms != null) {
    writeAtomic(llmsPath, llms);
    console.log(`   llms.txt: ${cityCount} villes, ${deptCount} départements, ${associations.length} associations`);
  }
  saveCache(cache);

  console.log(`\n✅ Sitemap generated: ${entries.length} URLs → ${outPath}`);
  console.log(`   Cache: ${CACHE_PATH}${FORCE ? " (forced)" : ""}`);
}

main().catch((err) => {
  // Échec de lecture ou de validation : levé avant toute écriture, aucun
  // fichier remplacé. Échec d'écriture : chaque fichier est remplacé de façon
  // atomique, mais l'ensemble n'est pas transactionnel (un fichier déjà
  // renommé reste en place).
  console.error("❌ Sitemap generation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
