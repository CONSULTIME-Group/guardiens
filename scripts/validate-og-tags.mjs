#!/usr/bin/env node
/**
 * Validation OG/Twitter — compare les balises servies par chaque route publique
 * avec la source de vérité (siteRoutes.ts + DEFAULT_OG_IMAGE).
 *
 * Pour la home (`/`), un check supplémentaire compare aussi `index.html`
 * (balises statiques servies aux bots avant hydratation React).
 *
 * Reproduit la logique de PageMeta.tsx :
 *   - titre final = titre brut sans suffixe, puis " | Guardiens" sauf sur "/"
 *   - image = ogImage spécifique de la route, sinon DEFAULT_OG_IMAGE
 *
 * Usage :
 *   node scripts/validate-og-tags.mjs                         # cibles par défaut
 *   node scripts/validate-og-tags.mjs https://guardiens.fr    # origine explicite
 *   node scripts/validate-og-tags.mjs --paths=/,/tarifs,/faq  # limiter les routes
 *   node scripts/validate-og-tags.mjs --concurrency=4         # parallélisme réseau
 *   node scripts/validate-og-tags.mjs --strict                # échec sur toute divergence
 *   TARGET_URL=https://... node scripts/validate-og-tags.mjs
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
const originArgs = cliArgs.filter(
  (a) => !a.startsWith("--") && /^https?:\/\//i.test(a),
);

const pathFilter = pathsArg
  ? pathsArg.slice("--paths=".length).split(",").map((p) => p.trim()).filter(Boolean)
  : null;
const concurrency = concurrencyArg
  ? Math.max(1, parseInt(concurrencyArg.slice("--concurrency=".length), 10) || 3)
  : 3;

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

  // Extraire chaque bloc de route. On reconnaît un bloc par la présence de
  // path + title + metaDescription + changeFreq + sitemapPriority.
  const routes = [];
  const blockRe = /\{\s*path:\s*(["'])([^"']+)\1[\s\S]*?\}/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    const block = m[0];
    const path_ = m[2];

    const title = extractStringLiteral(block, "title");
    const description = extractStringLiteral(block, "metaDescription");
    if (!title || !description) continue; // pas un vrai bloc de route

    const ogImage = extractStringLiteral(block, "ogImage") || defaultOgImage;

    routes.push({
      path: path_,
      rawTitle: title,
      description,
      image: ogImage,
    });
  }
  if (routes.length === 0) throw new Error("Aucune route extraite");

  return { siteUrl, defaultOgImage, routes };
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
  const metaRe = /<meta\b([^>]*)>/gi;
  let m;
  while ((m = metaRe.exec(html)) !== null) {
    const attrs = m[1];
    const nameMatch = attrs.match(/\b(?:property|name)\s*=\s*(["'])(.*?)\1/i);
    const contentMatch = attrs.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i);
    if (!nameMatch || !contentMatch) continue;
    const key = nameMatch[2].toLowerCase();
    if (key.startsWith("og:") || key.startsWith("twitter:")) {
      // Dernière valeur gagne (PageMeta réinjecte après hydratation)
      tags[key] = decodeHtmlEntities(contentMatch[2]);
    }
  }
  return tags;
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

function diffTags(actualTags, expectedTags) {
  const diffs = [];
  for (const [key, expected] of Object.entries(expectedTags)) {
    const actual = actualTags[key];
    if (actual == null) {
      diffs.push({ key, status: "MISSING", expected, actual: null });
    } else if (actual !== expected) {
      diffs.push({ key, status: "MISMATCH", expected, actual });
    }
  }
  return diffs;
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
// 7. Runner principal
// ──────────────────────────────────────────────────────────────

async function main() {
  console.log(c("bold", "\n🔎 Validation OG/Twitter — toutes routes publiques\n"));

  const { routes } = loadSiteConfig();
  const filteredRoutes = pathFilter
    ? routes.filter((r) => pathFilter.includes(r.path))
    : routes;

  if (filteredRoutes.length === 0) {
    console.error(c("red", "❌ Aucune route ne correspond au filtre --paths."));
    process.exit(2);
  }

  console.log(c("dim", `Routes à valider : ${filteredRoutes.length}`));
  console.log(c("dim", `Origines cibles  : ${normalizedOrigins.join(", ")}`));
  console.log(c("dim", `Concurrence      : ${concurrency}\n`));

  let totalDivergences = 0;
  let totalErrors = 0;

  // ─── Sanity check local : index.html doit correspondre à la home ─────
  const homeRoute = filteredRoutes.find((r) => r.path === "/");
  if (homeRoute) {
    const indexHtml = readFileSync(resolve(ROOT, "index.html"), "utf8");
    const indexTags = parseMetaTags(indexHtml);
    const expected = buildExpectedTags(homeRoute);
    const diffs = diffTags(indexTags, expected.tags);
    if (diffs.length > 0) {
      totalDivergences += diffs.length;
      console.log(c("yellow", "⚠️  index.html diverge de la route / :"));
      printDiffs(diffs);
      console.log(c("dim", '   → lancez `npm run sync-index-html` pour corriger.\n'));
    } else {
      console.log(c("green", "✅ index.html synchronisé avec la route /\n"));
    }
  }

  // ─── Pour chaque origine, pour chaque route, fetcher et differ ────────
  for (const origin of normalizedOrigins) {
    console.log(c("bold", `→ Origine : ${origin}`));

    const results = await runWithConcurrency(
      filteredRoutes,
      concurrency,
      async (route) => {
        const url = `${origin}${route.path}`;
        try {
          const html = await fetchAsBot(url);
          const tags = parseMetaTags(html);
          const expected = buildExpectedTags(route);
          const diffs = diffTags(tags, expected.tags);
          return { route, url, ok: true, diffs };
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
      if (r.diffs.length === 0) {
        console.log(`  ${c("green", "✅")} ${label}${c("dim", r.url)}`);
      } else {
        totalDivergences += r.diffs.length;
        console.log(`  ${c("red", "❌")} ${label}${c("red", `${r.diffs.length} écart(s)`)} ${c("dim", r.url)}`);
        printDiffs(r.diffs, "      ");
      }
    }
    console.log();
  }

  // ─── Synthèse ────────────────────────────────────────────────────────
  if (totalDivergences === 0 && totalErrors === 0) {
    console.log(c("green", "Résultat : toutes les routes sont synchronisées ✅\n"));
    process.exit(0);
  }

  const parts = [];
  if (totalDivergences > 0) parts.push(`${totalDivergences} divergence(s)`);
  if (totalErrors > 0) parts.push(`${totalErrors} erreur(s) réseau`);
  console.log(c("red", `Résultat : ${parts.join(" + ")}.`));
  console.log(c("dim", "💡 Si seule la prod diverge : purger Prerender.io / Cloudflare puis relancer.\n"));
  process.exit(1);
}

main().catch((err) => {
  console.error(c("red", `💥 Erreur fatale : ${err.message}`));
  console.error(err.stack);
  process.exit(2);
});
