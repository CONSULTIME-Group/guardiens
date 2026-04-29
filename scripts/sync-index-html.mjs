#!/usr/bin/env node
/**
 * Synchronise index.html (titre, OG, Twitter, <noscript>) depuis la source
 * unique de vérité : src/data/siteRoutes.ts (route "/" + DEFAULT_OG_IMAGE).
 *
 * Modes :
 *   node scripts/sync-index-html.mjs            # écrit index.html si divergence
 *   node scripts/sync-index-html.mjs --check    # CI : exit 1 si divergence, aucune écriture
 *
 * Exécuté automatiquement au build (cf. package.json "build").
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const INDEX_PATH = resolve(ROOT, "index.html");
const ROUTES_PATH = resolve(ROOT, "src/data/siteRoutes.ts");

const CHECK_ONLY = process.argv.includes("--check");

// ──────────────────────────────────────────────────────────────
// 0. Garde-fou : vocabulaire proscrit
// ──────────────────────────────────────────────────────────────
// Empêche la sync de réécrire des balises corrigées avec du contenu non
// conforme à la charte éditoriale (mémoires Core "Mot PROSCRIT" + "PROSCRIT
// régional"). Si un développeur réintroduit "AURA", "voisin" ou "votre région"
// dans siteRoutes.ts, le build casse AVANT que index.html ne soit pollué.
const FORBIDDEN_RULES = [
  { pattern: /\bAURA\b/, label: "AURA (acronyme régional proscrit)" },
  { pattern: /Auvergne-Rhône-Alpes/i, label: "« Auvergne-Rhône-Alpes » (proscrit régional)" },
  { pattern: /\bvoisin(?:e|s|age)?\b/i, label: "« voisin / voisinage » (mot proscrit)" },
  { pattern: /votre région/i, label: "« votre région » (proximité régionale interdite)" },
  { pattern: /\b9\s*€\s*\/\s*mois\b/i, label: "ancien tarif 9 €/mois (utiliser 6,99 €/mois)" },
  { pattern: /\bGratuit\b/, label: "« Gratuit » avec capitale (préférer « 0 € » en SEO)" },
];

function assertNoForbiddenVocabulary(truth) {
  const violations = [];
  const fields = {
    title: truth.title,
    "metaDescription (siteRoutes.ts route /)": truth.description,
  };
  for (const [field, value] of Object.entries(fields)) {
    for (const rule of FORBIDDEN_RULES) {
      if (rule.pattern.test(value)) {
        violations.push(`   ❌ Champ « ${field} » contient ${rule.label}`);
        violations.push(`      → "${value}"`);
      }
    }
  }
  if (violations.length > 0) {
    console.error("❌ GARDE-FOU SEO : vocabulaire proscrit détecté dans siteRoutes.ts.");
    console.error("   Le sync vers index.html est BLOQUÉ pour éviter d'écraser les");
    console.error("   balises conformes par du contenu interdit.\n");
    console.error(violations.join("\n"));
    console.error("\n   Corrigez src/data/siteRoutes.ts (route '/') puis relancez le build.");
    process.exit(3);
  }
}


// ──────────────────────────────────────────────────────────────
// 1. Extraire la vérité depuis siteRoutes.ts
// ──────────────────────────────────────────────────────────────

function extractStringLiteral(source, key) {
  const re = new RegExp(`${key}\\s*:\\s*(["'\`])((?:\\\\.|(?!\\1).)*)\\1`);
  const m = source.match(re);
  if (!m) return null;
  return m[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\`/g, "`");
}

function loadHomeTruth() {
  const src = readFileSync(ROUTES_PATH, "utf8");

  const siteUrlMatch = src.match(/export\s+const\s+SITE_URL\s*=\s*["']([^"']+)["']/);
  if (!siteUrlMatch) throw new Error("SITE_URL introuvable dans siteRoutes.ts");
  const siteUrl = siteUrlMatch[1];

  const defaultImgMatch = src.match(/DEFAULT_OG_IMAGE\s*=\s*`([^`]+)`/);
  const defaultImage = defaultImgMatch
    ? defaultImgMatch[1].replace(/\$\{SITE_URL\}/g, siteUrl)
    : null;

  const homeBlockMatch = src.match(/\{\s*path:\s*["']\/["'],[\s\S]*?\}/);
  if (!homeBlockMatch) throw new Error("Route '/' introuvable dans siteRoutes.ts");
  const block = homeBlockMatch[0];

  const title = extractStringLiteral(block, "title");
  const description = extractStringLiteral(block, "metaDescription");
  let image = extractStringLiteral(block, "ogImage");
  if (!image || image === "DEFAULT_OG_IMAGE") image = defaultImage;

  if (!title || !description || !image) {
    throw new Error(
      `Extraction incomplète : title=${title} desc=${description} image=${image}`,
    );
  }
  return { siteUrl, title, description, image };
}

// ──────────────────────────────────────────────────────────────
// 2. Encodage HTML pour écriture sans casser le document
// ──────────────────────────────────────────────────────────────

function attrEncode(s) {
  // Pour un attribut content="...", il faut échapper & et ". On laisse les
  // apostrophes droites telles quelles (elles sont valides à l'intérieur de
  // guillemets doubles).
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function textEncode(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ──────────────────────────────────────────────────────────────
// 3. Réécriture ciblée d'index.html
// ──────────────────────────────────────────────────────────────

/**
 * Remplace le contenu d'une balise meta identifiée par property="…" ou name="…".
 * Ne crée pas de nouvelle balise — on exige qu'elle existe déjà, pour éviter
 * les doublons côté bots sociaux (FB prend la dernière occurrence).
 */
function replaceMetaContent(html, { attr, key, value }) {
  // Accepte les deux ordres d'attributs et gère les apostrophes droites
  // DANS les valeurs (ex : "Partez l'esprit tranquille").
  // Astuce : on utilise `.*?` avec backref sur le délimiteur capturé,
  // et `[^>]*` ne traverse pas de chevron donc on reste dans la balise.
  const re = new RegExp(
    `(<meta\\s+[^>]*\\b${attr}=(["'])${key}\\2[^>]*\\bcontent=)(["'])(.*?)\\3([^>]*>)`,
    "i",
  );
  const reReverse = new RegExp(
    `(<meta\\s+[^>]*\\bcontent=)(["'])(.*?)\\2([^>]*\\b${attr}=(["'])${key}\\5[^>]*>)`,
    "i",
  );

  const encoded = attrEncode(value);
  if (re.test(html)) {
    return { html: html.replace(re, `$1$3${encoded}$3$5`), replaced: true };
  }
  if (reReverse.test(html)) {
    return { html: html.replace(reReverse, `$1$2${encoded}$2$4`), replaced: true };
  }
  return { html, replaced: false };
}

function replaceDocumentTitle(html, value) {
  const re = /(<title>)([\s\S]*?)(<\/title>)/i;
  if (!re.test(html)) return { html, replaced: false };
  return { html: html.replace(re, `$1${textEncode(value)}$3`), replaced: true };
}

function replaceNoscriptHero(html, { title, description }) {
  // Cible le premier <noscript> du document (celui de la home).
  const re = /(<noscript>[\s\S]*?<h1>)([\s\S]*?)(<\/h1>\s*<p>)([\s\S]*?)(<\/p>[\s\S]*?<\/noscript>)/i;
  if (!re.test(html)) return { html, replaced: false };
  return {
    html: html.replace(re, `$1${textEncode(title)}$3${textEncode(description)}$5`),
    replaced: true,
  };
}

// ──────────────────────────────────────────────────────────────
// 4. Orchestration
// ──────────────────────────────────────────────────────────────

function syncIndexHtml(html, truth) {
  const patches = [
    { kind: "title", apply: (h) => replaceDocumentTitle(h, truth.title) },
    { kind: "og:title", apply: (h) => replaceMetaContent(h, { attr: "property", key: "og:title", value: truth.title }) },
    { kind: "og:description", apply: (h) => replaceMetaContent(h, { attr: "property", key: "og:description", value: truth.description }) },
    { kind: "og:image", apply: (h) => replaceMetaContent(h, { attr: "property", key: "og:image", value: truth.image }) },
    { kind: "twitter:title", apply: (h) => replaceMetaContent(h, { attr: "name", key: "twitter:title", value: truth.title }) },
    { kind: "twitter:description", apply: (h) => replaceMetaContent(h, { attr: "name", key: "twitter:description", value: truth.description }) },
    { kind: "twitter:image", apply: (h) => replaceMetaContent(h, { attr: "name", key: "twitter:image", value: truth.image }) },
    { kind: "noscript", apply: (h) => replaceNoscriptHero(h, truth) },
  ];

  let current = html;
  const unreplaced = [];
  for (const p of patches) {
    const { html: next, replaced } = p.apply(current);
    if (!replaced) unreplaced.push(p.kind);
    current = next;
  }
  return { html: current, unreplaced };
}

function main() {
  const truth = loadHomeTruth();
  const original = readFileSync(INDEX_PATH, "utf8");
  const { html: updated, unreplaced } = syncIndexHtml(original, truth);

  if (unreplaced.length > 0) {
    console.error("❌ Balises introuvables dans index.html :", unreplaced.join(", "));
    console.error("   Impossible de synchroniser sans casser le document.");
    process.exit(2);
  }

  const changed = updated !== original;

  if (CHECK_ONLY) {
    if (changed) {
      console.error("❌ index.html diverge de siteRoutes.ts (route /).");
      console.error('   Lancez `node scripts/sync-index-html.mjs` pour corriger.');
      process.exit(1);
    }
    console.log("✅ index.html synchronisé avec siteRoutes.ts.");
    return;
  }

  if (!changed) {
    console.log("✅ index.html déjà à jour — aucun changement.");
    return;
  }

  writeFileSync(INDEX_PATH, updated, "utf8");
  console.log("✅ index.html synchronisé depuis siteRoutes.ts :");
  console.log(`   • title/og:title/twitter:title : ${truth.title}`);
  console.log(`   • og:description/twitter:description : ${truth.description}`);
  console.log(`   • og:image/twitter:image : ${truth.image}`);
}

main();
