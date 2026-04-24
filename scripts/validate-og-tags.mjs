#!/usr/bin/env node
/**
 * Validation OG/Twitter — compare les balises servies par une URL cible
 * avec la source de vérité (index.html + siteRoutes.ts pour la home).
 *
 * Usage :
 *   node scripts/validate-og-tags.mjs                        # cible par défaut : guardiens.lovable.app
 *   node scripts/validate-og-tags.mjs https://guardiens.fr   # cible explicite
 *   TARGET_URL=https://... node scripts/validate-og-tags.mjs
 *
 * Exit codes : 0 = OK, 1 = divergence, 2 = erreur réseau/parsing.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const DEFAULT_TARGETS = [
  "https://guardiens.lovable.app/",
  "https://guardiens.fr/",
];
const cliTargets = process.argv.slice(2).filter(Boolean);
const targets = cliTargets.length > 0
  ? cliTargets
  : (process.env.TARGET_URL ? [process.env.TARGET_URL] : DEFAULT_TARGETS);

// ──────────────────────────────────────────────────────────────
// 1. Construire la "vérité" attendue à partir du code source
// ──────────────────────────────────────────────────────────────

function extractStringLiteral(source, key) {
  // Match key: "value" ou key: 'value' (gère échappements basiques)
  const re = new RegExp(`${key}\\s*:\\s*(["'\`])((?:\\\\.|(?!\\1).)*)\\1`);
  const m = source.match(re);
  if (!m) return null;
  return m[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\`/g, "`");
}

function loadHomeExpected() {
  const siteRoutes = readFileSync(resolve(ROOT, "src/data/siteRoutes.ts"), "utf8");

  // Extraire le bloc de la route "/"
  const homeBlockMatch = siteRoutes.match(
    /\{\s*path:\s*["']\/["'],[\s\S]*?\}/,
  );
  if (!homeBlockMatch) throw new Error("Route '/' introuvable dans siteRoutes.ts");
  const homeBlock = homeBlockMatch[0];

  const title = extractStringLiteral(homeBlock, "title");
  const description = extractStringLiteral(homeBlock, "metaDescription");

  // Image OG : soit dans le bloc, soit la constante DEFAULT_OG_IMAGE
  let image = extractStringLiteral(homeBlock, "ogImage");
  if (!image || image === "DEFAULT_OG_IMAGE") {
    const defaultMatch = siteRoutes.match(
      /DEFAULT_OG_IMAGE\s*=\s*`([^`]+)`/,
    );
    if (defaultMatch) {
      const siteUrlMatch = siteRoutes.match(/SITE_URL\s*=\s*["']([^"']+)["']/);
      const siteUrl = siteUrlMatch ? siteUrlMatch[1] : "";
      image = defaultMatch[1].replace(/\$\{SITE_URL\}/g, siteUrl);
    }
  }

  if (!title || !description || !image) {
    throw new Error(
      `Extraction incomplète depuis siteRoutes.ts : title=${title} desc=${description} image=${image}`,
    );
  }

  return { title, description, image };
}

function loadIndexHtmlMetaTags() {
  const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
  return parseMetaTags(html);
}

// ──────────────────────────────────────────────────────────────
// 2. Parser les balises meta d'un document HTML
// ──────────────────────────────────────────────────────────────

function parseMetaTags(html) {
  const tags = {};
  // Autoriser attributs dans n'importe quel ordre.
  // Les regex utilisent des backreferences (\1 / \2) pour que la quote fermante
  // corresponde à l'ouvrante — sinon un contenu comme "Partez l'esprit" est
  // tronqué sur l'apostrophe droite.
  const metaRe = /<meta\b([^>]*)>/gi;
  let m;
  while ((m = metaRe.exec(html)) !== null) {
    const attrs = m[1];
    const nameMatch = attrs.match(/\b(?:property|name)\s*=\s*(["'])(.*?)\1/i);
    const contentMatch = attrs.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i);
    if (!nameMatch || !contentMatch) continue;
    const key = nameMatch[2].toLowerCase();
    if (key.startsWith("og:") || key.startsWith("twitter:")) {
      // PageMeta ré-injecte côté client : la dernière valeur gagne (= plus récente)
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
// 3. Fetch d'une URL en se faisant passer pour un bot social
// ──────────────────────────────────────────────────────────────

async function fetchAsBot(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      // Beaucoup de setups (Prerender.io, Cloudflare Worker) ne servent le HTML
      // pré-rendu qu'aux user-agents de bots sociaux.
      "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} pour ${url}`);
  }
  return res.text();
}

// ──────────────────────────────────────────────────────────────
// 4. Règles de validation
// ──────────────────────────────────────────────────────────────

/**
 * Règles attendues pour la home.
 * Clé = nom de la balise, valeur = string attendue (match strict).
 */
function buildExpectedTags(expected) {
  return {
    "og:title": expected.title,
    "og:description": expected.description,
    "og:image": expected.image,
    "og:type": "website",
    "og:site_name": "Guardiens",
    "og:locale": "fr_FR",
    "twitter:card": "summary_large_image",
    "twitter:title": expected.title,
    "twitter:description": expected.description,
    "twitter:image": expected.image,
  };
}

function validate(targetTags, expectedTags) {
  const diffs = [];
  for (const [key, expectedValue] of Object.entries(expectedTags)) {
    const actual = targetTags[key];
    if (actual == null) {
      diffs.push({ key, status: "MISSING", expected: expectedValue, actual: null });
    } else if (actual !== expectedValue) {
      diffs.push({ key, status: "MISMATCH", expected: expectedValue, actual });
    }
  }
  return diffs;
}

// ──────────────────────────────────────────────────────────────
// 5. Runner principal
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

function c(color, s) {
  return process.stdout.isTTY ? `${COLORS[color]}${s}${COLORS.reset}` : s;
}

async function main() {
  console.log(c("bold", "\n🔎 Validation des balises OG/Twitter de la page d'accueil\n"));

  const expected = loadHomeExpected();
  const indexHtmlTags = loadIndexHtmlMetaTags();
  const expectedTags = buildExpectedTags(expected);

  console.log(c("dim", "Source de vérité (siteRoutes.ts + DEFAULT_OG_IMAGE) :"));
  console.log(`  title       : ${c("cyan", expected.title)}`);
  console.log(`  description : ${c("cyan", expected.description)}`);
  console.log(`  image       : ${c("cyan", expected.image)}\n`);

  // Sanity check : index.html doit déjà être aligné sur la vérité
  const indexDiffs = validate(indexHtmlTags, expectedTags);
  if (indexDiffs.length > 0) {
    console.log(c("yellow", "⚠️  index.html diverge de siteRoutes.ts :"));
    for (const d of indexDiffs) {
      console.log(`  • ${d.key} [${d.status}]`);
      console.log(`      attendu : ${d.expected}`);
      console.log(`      trouvé  : ${d.actual ?? "(absent)"}`);
    }
    console.log();
  } else {
    console.log(c("green", "✅ index.html synchronisé avec siteRoutes.ts\n"));
  }

  let hasDivergence = indexDiffs.length > 0;

  for (const target of targets) {
    console.log(c("bold", `→ Cible : ${target}`));
    try {
      const html = await fetchAsBot(target);
      const tags = parseMetaTags(html);
      const diffs = validate(tags, expectedTags);

      if (diffs.length === 0) {
        console.log(c("green", "  ✅ Toutes les balises correspondent à la source de vérité.\n"));
      } else {
        hasDivergence = true;
        console.log(c("red", `  ❌ ${diffs.length} écart(s) détecté(s) :`));
        for (const d of diffs) {
          console.log(`  • ${c("yellow", d.key)} [${d.status}]`);
          console.log(`      attendu : ${c("green", d.expected)}`);
          console.log(`      trouvé  : ${c("red", d.actual ?? "(absent)")}`);
        }
        console.log();
      }
    } catch (err) {
      hasDivergence = true;
      console.log(c("red", `  💥 Erreur : ${err.message}\n`));
    }
  }

  if (hasDivergence) {
    console.log(c("red", "Résultat : divergence(s) détectée(s). Code de sortie = 1."));
    console.log(c("dim", "💡 Rappel : si seule la prod diverge, purger Prerender.io / Cloudflare puis relancer.\n"));
    process.exit(1);
  } else {
    console.log(c("green", "Résultat : tout est synchronisé. ✅\n"));
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(c("red", `💥 Erreur fatale : ${err.message}`));
  console.error(err.stack);
  process.exit(2);
});
