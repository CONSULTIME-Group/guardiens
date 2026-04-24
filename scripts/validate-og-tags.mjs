#!/usr/bin/env node
/**
 * Validation SEO complète — compare ce qui est servi sur chaque route publique
 * à la source de vérité (siteRoutes.ts + DEFAULT_OG_IMAGE + index.html).
 *
 * Checks couverts :
 *   1. Balises OG / Twitter (titre, description, image, type, locale…)
 *   2. <link rel="canonical"> → doit pointer vers SITE_URL + path
 *   3. JSON-LD (Schema.org) → présence et validité JSON sur la home
 *   4. sitemap.xml → toutes les routes publiques présentes avec bonne priorité
 *   5. robots.txt → sitemap référencé, pas de conflit Disallow vs sitemap
 *   6. meta robots → aucune route publique en noindex par erreur
 *
 * Usage :
 *   node scripts/validate-og-tags.mjs                         # tout activé, cibles par défaut
 *   node scripts/validate-og-tags.mjs https://guardiens.fr    # origine explicite
 *   node scripts/validate-og-tags.mjs --paths=/,/tarifs,/faq  # limiter les routes
 *   node scripts/validate-og-tags.mjs --concurrency=4         # parallélisme réseau
 *   node scripts/validate-og-tags.mjs --strict                # échec sur toute divergence
 *   node scripts/validate-og-tags.mjs --only=og,canonical     # limiter les checks
 *   node scripts/validate-og-tags.mjs --skip=sitemap,robots   # exclure des checks
 *   TARGET_URL=https://... node scripts/validate-og-tags.mjs
 *
 * Checks disponibles (clés pour --only / --skip) :
 *   og | canonical | schema | sitemap | robots | meta-robots
 *
 * Exit codes :
 *   0 = OK (home synchro ; autres routes non strictes ignorées)
 *   1 = divergence bloquante (home non synchro, ou --strict activé)
 *   2 = erreur fatale
 *
 * Note importante : sans pré-rendu côté hébergeur (Prerender.io, SSR…), les
 * routes internes servent les balises statiques d'index.html (= celles de la
 * home) aux bots sociaux, qui n'exécutent pas React. Les divergences sur les
 * routes non-home sont donc attendues et signalées en WARN par défaut.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ──────────────────────────────────────────────────────────────
// 0. Parsing des arguments CLI
// ──────────────────────────────────────────────────────────────

const DEFAULT_ORIGINS = [
  "https://guardiens.lovable.app",
  "https://guardiens.fr",
];

const cliArgs = process.argv.slice(2);
const pathsArg = cliArgs.find((a) => a.startsWith("--paths="));
const concurrencyArg = cliArgs.find((a) => a.startsWith("--concurrency="));
const onlyArg = cliArgs.find((a) => a.startsWith("--only="));
const skipArg = cliArgs.find((a) => a.startsWith("--skip="));
const originArgs = cliArgs.filter(
  (a) => !a.startsWith("--") && /^https?:\/\//i.test(a),
);

const pathFilter = pathsArg
  ? pathsArg.slice("--paths=".length).split(",").map((p) => p.trim()).filter(Boolean)
  : null;
const concurrency = concurrencyArg
  ? Math.max(1, parseInt(concurrencyArg.slice("--concurrency=".length), 10) || 3)
  : 3;
const strictMode = cliArgs.includes("--strict");
const includeDynamic = cliArgs.includes("--include-dynamic");
const dynamicLimitArg = cliArgs.find((a) => a.startsWith("--dynamic-limit="));
const dynamicLimit = dynamicLimitArg
  ? Math.max(0, parseInt(dynamicLimitArg.slice("--dynamic-limit=".length), 10) || 0)
  : 20;

// Checks disponibles et filtrage --only / --skip
const ALL_CHECKS = ["og", "canonical", "schema", "sitemap", "robots", "meta-robots"];
const onlySet = onlyArg
  ? new Set(onlyArg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean))
  : null;
const skipSet = skipArg
  ? new Set(skipArg.slice("--skip=".length).split(",").map((s) => s.trim()).filter(Boolean))
  : new Set();
const enabledChecks = new Set(
  ALL_CHECKS.filter((c) => (onlySet ? onlySet.has(c) : true) && !skipSet.has(c)),
);

const origins = originArgs.length > 0
  ? originArgs
  : (process.env.TARGET_URL ? [process.env.TARGET_URL] : DEFAULT_ORIGINS);

// Normalise : pas de trailing slash sur l'origine
const normalizedOrigins = origins.map((o) => o.replace(/\/+$/, ""));

// ──────────────────────────────────────────────────────────────
// 1. Extraire toutes les routes depuis siteRoutes.ts
// ──────────────────────────────────────────────────────────────

function extractStringLiteral(source, key) {
  // Gère "value", 'value', `value`, et apostrophes dans la valeur
  const re = new RegExp(`${key}\\s*:\\s*(["'\`])((?:\\\\.|(?!\\1).)*)\\1`);
  const m = source.match(re);
  if (!m) return null;
  return m[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\`/g, "`");
}

function loadSiteConfig() {
  const src = readFileSync(resolve(ROOT, "src/data/siteRoutes.ts"), "utf8");

  const siteUrlMatch = src.match(/export\s+const\s+SITE_URL\s*=\s*["']([^"']+)["']/);
  if (!siteUrlMatch) throw new Error("SITE_URL introuvable dans siteRoutes.ts");
  const siteUrl = siteUrlMatch[1];

  const defaultImgMatch = src.match(/DEFAULT_OG_IMAGE\s*=\s*`([^`]+)`/);
  const defaultOgImage = defaultImgMatch
    ? defaultImgMatch[1].replace(/\$\{SITE_URL\}/g, siteUrl)
    : null;
  if (!defaultOgImage) throw new Error("DEFAULT_OG_IMAGE introuvable");

  // On isole d'abord le bloc staticRoutes pour ne pas mélanger avec dynamicRoutes
  const staticBlockMatch = src.match(/staticRoutes\s*:\s*SiteRoute\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (!staticBlockMatch) throw new Error("staticRoutes introuvable dans siteRoutes.ts");
  const staticBody = staticBlockMatch[1];

  // Extraire chaque bloc de route statique.
  const routes = [];
  const blockRe = /\{\s*path:\s*(["'])([^"']+)\1[\s\S]*?\n\s*\}/g;
  let m;
  while ((m = blockRe.exec(staticBody)) !== null) {
    const block = m[0];
    const path_ = m[2];

    const title = extractStringLiteral(block, "title");
    const description = extractStringLiteral(block, "metaDescription");
    if (!title || !description) continue;

    const ogImage = extractStringLiteral(block, "ogImage") || defaultOgImage;
    const sitemapPriority = extractStringLiteral(block, "sitemapPriority");
    const changeFreqMatch = block.match(
      /changeFreq:\s*(["'])(daily|weekly|monthly|yearly)\1/,
    );
    const changeFreq = changeFreqMatch ? changeFreqMatch[2] : null;

    routes.push({
      path: path_,
      rawTitle: title,
      description,
      image: ogImage,
      sitemapPriority,
      changeFreq,
      isDynamic: false,
    });
  }
  if (routes.length === 0) throw new Error("Aucune route statique extraite");

  // Extraire dynamicRoutes (optionnel)
  const dynamicBlockMatch = src.match(/dynamicRoutes\s*:\s*DynamicRouteConfig\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  const dynamicConfigs = [];
  if (dynamicBlockMatch) {
    const dynBody = dynamicBlockMatch[1];
    const dynRe = /\{\s*pathPattern:\s*(["'])([^"']+)\1[\s\S]*?\n\s*\}/g;
    let dm;
    while ((dm = dynRe.exec(dynBody)) !== null) {
      const block = dm[0];
      const pathPattern = dm[2];
      const title = extractStringLiteral(block, "title");
      const description = extractStringLiteral(block, "metaDescription");
      const source = extractStringLiteral(block, "source");
      const sitemapPriority = extractStringLiteral(block, "sitemapPriority");
      const ogImage = extractStringLiteral(block, "ogImage") || defaultOgImage;
      const changeFreqMatch = block.match(
        /changeFreq:\s*(["'])(daily|weekly|monthly|yearly)\1/,
      );
      const dynamicTitle = /dynamicTitle:\s*true/.test(block);
      const dynamicDescription = /dynamicDescription:\s*true/.test(block);
      if (!pathPattern || !title || !description || !source) continue;
      dynamicConfigs.push({
        pathPattern,
        source,
        title,
        description,
        image: ogImage,
        sitemapPriority,
        changeFreq: changeFreqMatch ? changeFreqMatch[2] : null,
        dynamicTitle,
        dynamicDescription,
      });
    }
  }

  return { siteUrl, defaultOgImage, routes, dynamicConfigs };
}

// ──────────────────────────────────────────────────────────────
// 1bis. Expansion des routes dynamiques (via sitemap)
// ──────────────────────────────────────────────────────────────

/**
 * Convertit "/actualites/:slug" en RegExp + liste des paramètres.
 */
function patternToRegex(pattern) {
  const params = [];
  const re = pattern.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, (tok) => {
    params.push(tok.slice(1));
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${re}$`), params };
}

/**
 * Interpole les `{param}` dans un template avec les valeurs extraites.
 */
function interpolateTemplate(template, values) {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, k) => values[k] ?? `{${k}}`);
}

/**
 * Pour chaque DynamicRouteConfig, résout les instances et produit des routes
 * au même format que les routes statiques (prêtes pour buildExpectedTags).
 */
async function expandDynamicRoutes(dynamicConfigs, origin, siteUrl, defaultOgImage) {
  if (!dynamicConfigs || dynamicConfigs.length === 0) return [];

  // On récupère le sitemap une seule fois par origine
  let sitemapPaths = null;
  const needSitemap = dynamicConfigs.some((d) => d.source === "sitemap");
  if (needSitemap) {
    try {
      const xml = await fetchText(`${origin}/sitemap.xml`);
      const entries = parseSitemap(xml);
      sitemapPaths = entries
        .map((e) => {
          try {
            return new URL(e.loc).pathname;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch (err) {
      console.log(c("yellow", `  ⚠️  Impossible de lire le sitemap pour expansion dynamique : ${err.message}`));
      sitemapPaths = [];
    }
  }

  const expanded = [];
  for (const cfg of dynamicConfigs) {
    const { regex, params } = patternToRegex(cfg.pathPattern);
    let paths = [];
    if (cfg.source === "sitemap") {
      paths = (sitemapPaths || []).filter((p) => regex.test(p));
    } else if (cfg.source === "inline" && Array.isArray(cfg.instances)) {
      paths = cfg.instances.map((vals) =>
        cfg.pathPattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, k) => vals[k] ?? `:${k}`),
      );
    }

    for (const p of paths) {
      const match = p.match(regex);
      const values = {};
      params.forEach((name, i) => (values[name] = match?.[i + 1] ?? ""));
      expanded.push({
        path: p,
        rawTitle: interpolateTemplate(cfg.title, values),
        description: interpolateTemplate(cfg.description, values),
        image: cfg.image || defaultOgImage,
        sitemapPriority: cfg.sitemapPriority,
        changeFreq: cfg.changeFreq,
        isDynamic: true,
        pathPattern: cfg.pathPattern,
        dynamicTitle: cfg.dynamicTitle,
        dynamicDescription: cfg.dynamicDescription,
      });
    }
  }
  return expanded;
}

// ──────────────────────────────────────────────────────────────
// 2. Reproduire la logique de titre de PageMeta.tsx
// ──────────────────────────────────────────────────────────────

const SITE_NAME = "Guardiens";

function computeFinalTitle(rawTitle, path_) {
  const stripped = rawTitle
    .replace(/\s*\|\s*Guardiens\s*$/i, "")
    .replace(/\s*—\s*Guardiens\s*$/i, "");
  return path_ === "/" ? stripped : `${stripped} | ${SITE_NAME}`;
}

function buildExpectedTags(route) {
  const finalTitle = computeFinalTitle(route.rawTitle, route.path);
  return {
    finalTitle,
    image: route.image,
    description: route.description,
    tags: {
      "og:title": finalTitle,
      "og:description": route.description,
      "og:image": route.image,
      "og:type": "website",
      "og:site_name": SITE_NAME,
      "og:locale": "fr_FR",
      "twitter:card": "summary_large_image",
      "twitter:title": finalTitle,
      "twitter:description": route.description,
      "twitter:image": route.image,
    },
  };
}

// ──────────────────────────────────────────────────────────────
// 3. Parser les balises meta d'un document HTML
// ──────────────────────────────────────────────────────────────

function parseMetaTags(html) {
  const tags = {};
  let metaRobots = null;
  const metaRe = /<meta\b([^>]*)>/gi;
  let m;
  while ((m = metaRe.exec(html)) !== null) {
    const attrs = m[1];
    const nameMatch = attrs.match(/\b(?:property|name)\s*=\s*(["'])(.*?)\1/i);
    const contentMatch = attrs.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i);
    if (!nameMatch || !contentMatch) continue;
    const key = nameMatch[2].toLowerCase();
    const value = decodeHtmlEntities(contentMatch[2]);
    if (key.startsWith("og:") || key.startsWith("twitter:")) {
      tags[key] = value; // dernière valeur gagne (PageMeta réinjecte après hydratation)
    } else if (key === "robots") {
      metaRobots = value;
    }
  }
  return { tags, metaRobots };
}

function parseCanonical(html) {
  // Prend la DERNIÈRE <link rel="canonical"> (PageMeta retire puis ré-ajoute)
  const re = /<link\b[^>]*\brel\s*=\s*(["'])canonical\1[^>]*\bhref\s*=\s*(["'])([\s\S]*?)\2[^>]*>/gi;
  const reReverse = /<link\b[^>]*\bhref\s*=\s*(["'])([\s\S]*?)\1[^>]*\brel\s*=\s*(["'])canonical\3[^>]*>/gi;
  let last = null;
  let m;
  while ((m = re.exec(html)) !== null) last = decodeHtmlEntities(m[3]);
  while ((m = reReverse.exec(html)) !== null) last = decodeHtmlEntities(m[2]);
  return last;
}

function parseJsonLd(html) {
  // Extrait tous les blocs <script type="application/ld+json">…</script>
  const blocks = [];
  const re = /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[2].trim();
    let parsed = null;
    let error = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      error = err.message;
    }
    blocks.push({ raw, parsed, error });
  }
  return blocks;
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// ──────────────────────────────────────────────────────────────
// 4. Fetch en user-agent bot social (pour déclencher Prerender.io)
// ──────────────────────────────────────────────────────────────

async function fetchAsBot(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

// Simple pool à concurrence bornée
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ──────────────────────────────────────────────────────────────
// 5. Diff attendu vs. observé
// ──────────────────────────────────────────────────────────────

function diffTags(actualTags, expectedTags, options = {}) {
  const { tolerantKeys = new Set() } = options;
  const diffs = [];
  for (const [key, expected] of Object.entries(expectedTags)) {
    const actual = actualTags[key];
    if (actual == null) {
      diffs.push({ key, status: "MISSING", expected, actual: null });
    } else if (tolerantKeys.has(key)) {
      // Mode tolérant : on vérifie juste que la valeur existe et n'est pas vide
      if (!actual.trim()) {
        diffs.push({ key, status: "EMPTY", expected: "(valeur non vide attendue)", actual });
      }
    } else if (actual !== expected) {
      diffs.push({ key, status: "MISMATCH", expected, actual });
    }
  }
  return diffs;
}

/**
 * Construit le set de clés à traiter en "tolérant" (présence suffit) pour une
 * route dynamique avec dynamicTitle / dynamicDescription.
 */
function tolerantKeysFor(route) {
  const keys = new Set();
  if (!route.isDynamic) return keys;
  if (route.dynamicTitle) {
    keys.add("og:title");
    keys.add("twitter:title");
  }
  if (route.dynamicDescription) {
    keys.add("og:description");
    keys.add("twitter:description");
  }
  return keys;
}

// ──────────────────────────────────────────────────────────────
// 6. Affichage
// ──────────────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};
const c = (color, s) =>
  process.stdout.isTTY ? `${COLORS[color]}${s}${COLORS.reset}` : s;

function printDiffs(diffs, indent = "  ") {
  for (const d of diffs) {
    console.log(`${indent}• ${c("yellow", d.key)} [${d.status}]`);
    console.log(`${indent}    attendu : ${c("green", d.expected)}`);
    console.log(`${indent}    trouvé  : ${c("red", d.actual ?? "(absent)")}`);
  }
}

// ──────────────────────────────────────────────────────────────
// 7. Checks origine-level (sitemap.xml, robots.txt)
// ──────────────────────────────────────────────────────────────

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 guardiens-validate-og/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

function parseSitemap(xml) {
  // Extrait [{loc, priority, changefreq}] pour chaque <url>
  const entries = [];
  const urlRe = /<url>([\s\S]*?)<\/url>/gi;
  let m;
  while ((m = urlRe.exec(xml)) !== null) {
    const block = m[1];
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1]?.trim();
    const priority = block.match(/<priority>([\s\S]*?)<\/priority>/)?.[1]?.trim();
    const changefreq = block.match(/<changefreq>([\s\S]*?)<\/changefreq>/)?.[1]?.trim();
    if (loc) entries.push({ loc, priority, changefreq });
  }
  return entries;
}

function parseRobotsTxt(txt) {
  const disallow = [];
  const sitemaps = [];
  let currentUA = "*";
  for (const line of txt.split(/\r?\n/)) {
    const clean = line.replace(/#.*$/, "").trim();
    if (!clean) continue;
    const [rawKey, ...rest] = clean.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") currentUA = value;
    else if (key === "disallow" && currentUA === "*" && value) disallow.push(value);
    else if (key === "sitemap") sitemaps.push(value);
  }
  return { disallow, sitemaps };
}

async function validateSitemap(origin, routes, siteUrl) {
  const url = `${origin}/sitemap.xml`;
  const xml = await fetchText(url);
  const entries = parseSitemap(xml);
  const locSet = new Map(entries.map((e) => [e.loc, e]));

  // On s'attend à trouver chaque route publique (sauf /login) avec bonne priorité
  const EXCLUDED = new Set(["/login"]);
  const diffs = [];
  for (const r of routes) {
    if (EXCLUDED.has(r.path)) continue;
    const expectedLoc = `${siteUrl}${r.path === "/" ? "" : r.path}`;
    // Le sitemap sert la home en "https://guardiens.fr/" OU "https://guardiens.fr"
    const entry = locSet.get(expectedLoc) || locSet.get(`${expectedLoc}/`);
    if (!entry) {
      diffs.push({ path: r.path, issue: `absent du sitemap (attendu : ${expectedLoc})` });
      continue;
    }
    if (r.sitemapPriority && entry.priority !== r.sitemapPriority) {
      diffs.push({ path: r.path, issue: `priorité ${entry.priority} ≠ attendu ${r.sitemapPriority}` });
    }
    if (r.changeFreq && entry.changefreq !== r.changeFreq) {
      diffs.push({ path: r.path, issue: `changefreq ${entry.changefreq} ≠ attendu ${r.changeFreq}` });
    }
  }
  return { url, entriesCount: entries.length, diffs };
}

async function validateRobots(origin, routes, siteUrl) {
  const url = `${origin}/robots.txt`;
  const txt = await fetchText(url);
  const { disallow, sitemaps } = parseRobotsTxt(txt);
  const issues = [];

  // Sitemap référencé
  const expectedSitemap = `${siteUrl}/sitemap.xml`;
  if (!sitemaps.some((s) => s === expectedSitemap)) {
    issues.push(`Sitemap absent ou différent (attendu : ${expectedSitemap}, trouvé : ${sitemaps.join(", ") || "(aucun)"})`);
  }

  // Conflits : route publique indexable mais disallowée
  const EXCLUDED = new Set(["/login"]);
  for (const r of routes) {
    if (EXCLUDED.has(r.path) || r.path === "/") continue;
    const conflicts = disallow.filter((d) => r.path === d || r.path.startsWith(d.replace(/\/$/, "") + "/"));
    if (conflicts.length > 0) {
      issues.push(`${r.path} est dans sitemap mais Disallow: ${conflicts.join(", ")}`);
    }
  }
  return { url, disallow, sitemaps, issues };
}

// ──────────────────────────────────────────────────────────────
// 8. Runner principal
// ──────────────────────────────────────────────────────────────

async function main() {
  console.log(c("bold", "\n🔎 Validation SEO — OG, canonical, schema, sitemap, robots\n"));

  const { routes, siteUrl, defaultOgImage, dynamicConfigs } = loadSiteConfig();
  const filteredStaticRoutes = pathFilter
    ? routes.filter((r) => pathFilter.includes(r.path))
    : routes;

  if (filteredStaticRoutes.length === 0) {
    console.error(c("red", "❌ Aucune route ne correspond au filtre --paths."));
    process.exit(2);
  }

  console.log(c("dim", `Routes statiques : ${filteredStaticRoutes.length}`));
  console.log(c("dim", `Routes dynamiques: ${includeDynamic ? `activées (${dynamicConfigs.length} pattern(s), limite ${dynamicLimit || "∞"}/pattern)` : "désactivées (--include-dynamic pour activer)"}`));
  console.log(c("dim", `Origines cibles  : ${normalizedOrigins.join(", ")}`));
  console.log(c("dim", `Concurrence      : ${concurrency}`));
  console.log(c("dim", `Checks actifs    : ${[...enabledChecks].join(", ")}`));
  console.log(c("dim", `Mode             : ${strictMode ? "strict" : "permissif (home stricte, autres = warn)"}\n`));

  let blockingIssues = 0;
  let warnings = 0;
  let totalErrors = 0;

  // ─── Sanity check local : index.html doit correspondre à la home ─────
  if (enabledChecks.has("og")) {
    const homeRoute = filteredRoutes.find((r) => r.path === "/");
    if (homeRoute) {
      const indexHtml = readFileSync(resolve(ROOT, "index.html"), "utf8");
      const { tags: indexTags } = parseMetaTags(indexHtml);
      const expected = buildExpectedTags(homeRoute);
      const diffs = diffTags(indexTags, expected.tags);
      if (diffs.length > 0) {
        blockingIssues += diffs.length;
        console.log(c("yellow", "⚠️  index.html diverge de la route / :"));
        printDiffs(diffs);
        console.log(c("dim", '   → lancez `npm run sync-index-html` pour corriger.\n'));
      } else {
        console.log(c("green", "✅ index.html synchronisé avec la route /\n"));
      }
    }
  }

  for (const origin of normalizedOrigins) {
    console.log(c("bold", `━━━ Origine : ${origin} ━━━`));

    // ─── Sitemap (origine-level) ────────────────────────────────────────
    if (enabledChecks.has("sitemap")) {
      try {
        const { url, entriesCount, diffs } = await validateSitemap(origin, filteredRoutes, siteUrl);
        if (diffs.length === 0) {
          console.log(`  ${c("green", "✅")} sitemap.xml (${entriesCount} URLs) ${c("dim", url)}`);
        } else {
          blockingIssues += diffs.length;
          console.log(`  ${c("red", "❌")} sitemap.xml — ${diffs.length} problème(s) ${c("dim", url)}`);
          for (const d of diffs) console.log(`      • ${c("yellow", d.path)} : ${d.issue}`);
        }
      } catch (err) {
        totalErrors += 1;
        console.log(`  ${c("red", "💥")} sitemap.xml : ${err.message}`);
      }
    }

    // ─── robots.txt (origine-level) ─────────────────────────────────────
    if (enabledChecks.has("robots")) {
      try {
        const { url, issues } = await validateRobots(origin, filteredRoutes, siteUrl);
        if (issues.length === 0) {
          console.log(`  ${c("green", "✅")} robots.txt ${c("dim", url)}`);
        } else {
          blockingIssues += issues.length;
          console.log(`  ${c("red", "❌")} robots.txt — ${issues.length} problème(s) ${c("dim", url)}`);
          for (const i of issues) console.log(`      • ${i}`);
        }
      } catch (err) {
        totalErrors += 1;
        console.log(`  ${c("red", "💥")} robots.txt : ${err.message}`);
      }
    }

    // ─── Checks par route (og, canonical, schema, meta-robots) ──────────
    const needsPageFetch = ["og", "canonical", "schema", "meta-robots"]
      .some((k) => enabledChecks.has(k));
    if (!needsPageFetch) {
      console.log();
      continue;
    }

    const results = await runWithConcurrency(
      filteredRoutes,
      concurrency,
      async (route) => {
        const url = `${origin}${route.path}`;
        try {
          const html = await fetchAsBot(url);
          const { tags, metaRobots } = parseMetaTags(html);
          const expected = buildExpectedTags(route);
          const ogDiffs = enabledChecks.has("og") ? diffTags(tags, expected.tags) : [];

          // Chaque issue a un `severity` : "always" (toujours bloquant) ou
          // "prerender" (dépend du pré-rendu, warn hors --strict sauf home).
          const pageIssues = [];

          if (enabledChecks.has("canonical")) {
            const canonical = parseCanonical(html);
            const expectedCanon = `${siteUrl}${route.path === "/" ? "/" : route.path}`;
            if (!canonical) {
              pageIssues.push({ kind: "canonical", severity: "prerender", msg: "absent" });
            } else if (canonical !== expectedCanon) {
              pageIssues.push({ kind: "canonical", severity: "prerender", msg: `${canonical} ≠ attendu ${expectedCanon}` });
            }
          }

          if (enabledChecks.has("meta-robots")) {
            // Un noindex servi statiquement = vrai bug, toujours bloquant
            if (metaRobots && /noindex/i.test(metaRobots)) {
              pageIssues.push({ kind: "meta-robots", severity: "always", msg: `noindex détecté sur route publique (${metaRobots})` });
            }
          }

          if (enabledChecks.has("schema") && route.path === "/") {
            const blocks = parseJsonLd(html);
            if (blocks.length === 0) {
              pageIssues.push({ kind: "schema", severity: "prerender", msg: "aucun bloc JSON-LD trouvé sur la home" });
            } else {
              const invalid = blocks.filter((b) => b.error);
              if (invalid.length > 0) {
                // JSON cassé = toujours bloquant (c'est dans le code source)
                pageIssues.push({ kind: "schema", severity: "always", msg: `${invalid.length}/${blocks.length} bloc(s) JSON-LD invalide(s) : ${invalid[0].error}` });
              }
              const hasOrg = blocks.some((b) => b.parsed?.["@type"] === "Organization");
              if (!hasOrg && invalid.length === 0) {
                pageIssues.push({ kind: "schema", severity: "prerender", msg: "aucun @type=Organization trouvé (attendu sur la home)" });
              }
            }
          }

          return { route, url, ok: true, ogDiffs, pageIssues };
        } catch (err) {
          return { route, url, ok: false, error: err.message };
        }
      },
    );

    for (const r of results) {
      const label = `${r.route.path.padEnd(22)} `;
      if (!r.ok) {
        totalErrors += 1;
        console.log(`  ${c("red", "💥")} ${label}${c("red", r.error)}`);
        continue;
      }

      const ogCount = r.ogDiffs.length;
      const pageCount = r.pageIssues.length;
      const total = ogCount + pageCount;

      if (total === 0) {
        console.log(`  ${c("green", "✅")} ${label}${c("dim", r.url)}`);
        continue;
      }

      // Bucket OG : bloquant si home ou --strict, sinon warn
      const ogBlocking = strictMode || r.route.path === "/";
      if (ogCount > 0) {
        if (ogBlocking) blockingIssues += ogCount;
        else warnings += ogCount;
      }

      // Page issues : chacune a sa sévérité ("always" ou "prerender")
      let pageBlockCount = 0;
      let pageWarnCount = 0;
      for (const pi of r.pageIssues) {
        const isBlocking = pi.severity === "always" || strictMode || r.route.path === "/";
        if (isBlocking) pageBlockCount++;
        else pageWarnCount++;
      }
      blockingIssues += pageBlockCount;
      warnings += pageWarnCount;

      const parts = [];
      if (ogCount > 0) parts.push(`${ogCount} OG`);
      if (pageCount > 0) parts.push(`${pageCount} autre(s)`);
      const anyBlocking = (ogBlocking && ogCount > 0) || pageBlockCount > 0;
      const icon = anyBlocking ? c("red", "❌") : c("yellow", "⚠️ ");
      console.log(`  ${icon} ${label}${parts.join(" + ")} ${c("dim", r.url)}`);

      if (ogCount > 0) printDiffs(r.ogDiffs, "      ");
      for (const pi of r.pageIssues) {
        console.log(`      • ${c("yellow", pi.kind)} : ${pi.msg}`);
      }
    }
    console.log();
  }

  // ─── Synthèse ────────────────────────────────────────────────────────
  console.log(c("bold", "Synthèse :"));
  if (blockingIssues > 0) console.log(c("red",    `  ❌ ${blockingIssues} problème(s) bloquant(s)`));
  if (warnings > 0)       console.log(c("yellow", `  ⚠️  ${warnings} OG non bloquant(s) (bots servis par index.html, pas de pré-rendu)`));
  if (totalErrors > 0)    console.log(c("red",    `  💥 ${totalErrors} erreur(s) réseau`));

  if (blockingIssues === 0 && totalErrors === 0) {
    if (warnings > 0) {
      console.log(c("dim", "\n💡 Les routes non-home ne sont pas pré-rendues : les bots sociaux lisent index.html."));
      console.log(c("dim", "   Activez Prerender.io / SSR pour que FB & LinkedIn voient les bons titres par page.\n"));
    } else {
      console.log(c("green", "\n✅ Tout est synchronisé.\n"));
    }
    process.exit(0);
  }

  console.log(c("dim", "\n💡 Si seule la prod diverge : purger Prerender.io / Cloudflare puis relancer.\n"));
  process.exit(1);
}

main().catch((err) => {
  console.error(c("red", `💥 Erreur fatale : ${err.message}`));
  console.error(err.stack);
  process.exit(2);
});
