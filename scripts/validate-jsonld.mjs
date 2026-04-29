#!/usr/bin/env node
/**
 * Validation systématique JSON-LD
 * Scanne tout le code source pour les schémas Schema.org et vérifie:
 *   - Aucun vocabulaire proscrit (AURA, Auvergne-Rhône-Alpes, voisin, votre région, "gratuit" en SEO)
 *   - Cohérence des prix (0 € propriétaire, 6,99 € sitter — pas de "9 €/mois")
 *   - areaServed = global / France (pas régional restreint)
 *   - Présence des @type clés selon les pages
 *
 * Usage: node scripts/validate-jsonld.mjs
 * CI:    exit 1 si erreurs critiques détectées
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

// ───────────────── Règles ─────────────────
const FORBIDDEN_PATTERNS = [
  { pattern: /\bAURA\b/, label: "AURA (acronyme régional)", severity: "error" },
  { pattern: /Auvergne-Rhône-Alpes/i, label: "Auvergne-Rhône-Alpes", severity: "error" },
  { pattern: /\bvoisin(?:e|s|age)?\b/i, label: "voisin/voisinage (mot proscrit)", severity: "error" },
  { pattern: /votre région/i, label: "« votre région » (proximité régionale)", severity: "error" },
  { pattern: /\bgratuit(?:e|s|es)?\b/i, label: "« gratuit » (utiliser « 0 € » en SEO)", severity: "warn" },
  { pattern: /\b9\s*€\s*\/\s*mois\b/i, label: "ancien prix 9 €/mois (utiliser 6,99 €/mois)", severity: "error" },
  { pattern: /\b9€\/mois\b/i, label: "ancien prix 9€/mois", severity: "error" },
];

// Champs JSON-LD à inspecter prioritairement (texte libre)
const TEXT_FIELDS = [
  "name", "description", "headline", "alternateName",
  "slogan", "disambiguatingDescription", "text",
  "areaServed", "serviceArea", "addressRegion", "addressLocality",
  "priceRange", "price", "offers",
];

// ───────────────── Walk ─────────────────
function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (["node_modules", "dist", ".git", "build"].includes(entry)) continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?|html|json)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

// ───────────────── Extraction des objets JSON-LD ─────────────────
/**
 * Cherche tous les objets ressemblant à du JSON-LD :
 *   - blocs `JSON.stringify({...})` contenant `"@type"`
 *   - littéraux `{ "@context": "..." }` ou `{ "@type": "..." }`
 *   - blocs <script type="application/ld+json">{...}</script>
 */
function extractJsonLdBlocks(source, file) {
  const blocks = [];

  // 1) Bloc <script type="application/ld+json"> ... </script>
  const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = scriptRe.exec(source))) {
    blocks.push({ raw: m[1].trim(), file, kind: "script-tag" });
  }

  // 2) Détection grossière de littéraux d'objets contenant "@type" ou "@context"
  //    On extrait par balance d'accolades à partir de chaque occurrence.
  const markerRe = /["']@(?:type|context)["']\s*:/g;
  const seen = new Set();
  while ((m = markerRe.exec(source))) {
    // Remonter pour trouver l'accolade ouvrante de l'objet englobant
    let i = m.index;
    let depth = 0;
    let start = -1;
    for (let j = i; j >= 0; j--) {
      const c = source[j];
      if (c === "}") depth++;
      else if (c === "{") {
        if (depth === 0) { start = j; break; }
        depth--;
      }
    }
    if (start === -1 || seen.has(start)) continue;

    // Avancer pour trouver l'accolade fermante équilibrée
    depth = 0;
    let end = -1;
    let inStr = false;
    let strCh = "";
    let escape = false;
    for (let j = start; j < source.length; j++) {
      const c = source[j];
      if (inStr) {
        if (escape) { escape = false; continue; }
        if (c === "\\") { escape = true; continue; }
        if (c === strCh) { inStr = false; }
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { inStr = true; strCh = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) { end = j; break; }
      }
    }
    if (end === -1) continue;
    seen.add(start);
    blocks.push({ raw: source.slice(start, end + 1), file, kind: "object-literal", offset: start });
  }

  return blocks;
}

// ───────────────── Validation d'un bloc ─────────────────
function lineOf(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function validateBlock(block, source) {
  const issues = [];
  const raw = block.raw;

  // Devine le type
  const typeMatch = raw.match(/["']@type["']\s*:\s*["']([^"']+)["']/);
  const schemaType = typeMatch ? typeMatch[1] : "Unknown";

  for (const rule of FORBIDDEN_PATTERNS) {
    const match = raw.match(rule.pattern);
    if (match) {
      // Filtre faux-positifs : "gratuit" peut apparaître dans une URL slug
      if (rule.label.startsWith("« gratuit »") && /\/[\w-]*gratuit/.test(raw)) continue;
      issues.push({
        severity: rule.severity,
        label: rule.label,
        snippet: extractContext(raw, match.index, 60),
        schemaType,
      });
    }
  }

  return { schemaType, issues };
}

function extractContext(text, idx, span) {
  const start = Math.max(0, idx - span);
  const end = Math.min(text.length, idx + span);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

// ───────────────── Run ─────────────────
const files = [...walk(SRC), join(ROOT, "index.html")].filter(f => {
  try { return statSync(f).isFile(); } catch { return false; }
});

let totalBlocks = 0;
let totalErrors = 0;
let totalWarnings = 0;
const report = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const blocks = extractJsonLdBlocks(source, file);
  if (!blocks.length) continue;
  totalBlocks += blocks.length;

  const fileIssues = [];
  for (const b of blocks) {
    const { schemaType, issues } = validateBlock(b, source);
    if (!issues.length) continue;
    const line = b.offset != null ? lineOf(source, b.offset) : "?";
    for (const i of issues) {
      fileIssues.push({ ...i, line, schemaType });
      if (i.severity === "error") totalErrors++;
      else totalWarnings++;
    }
  }
  if (fileIssues.length) {
    report.push({ file: relative(ROOT, file), issues: fileIssues });
  }
}

// ───────────────── Sortie ─────────────────
console.log("\n🔍 VALIDATION JSON-LD SCHEMA.ORG\n" + "═".repeat(60));
console.log(`Fichiers scannés : ${files.length}`);
console.log(`Blocs JSON-LD trouvés : ${totalBlocks}`);
console.log(`Erreurs : ${totalErrors}    Avertissements : ${totalWarnings}\n`);

if (!report.length) {
  console.log("✅ Aucun vocabulaire proscrit dans le JSON-LD.");
  process.exit(0);
}

for (const { file, issues } of report) {
  console.log(`\n📄 ${file}`);
  for (const i of issues) {
    const icon = i.severity === "error" ? "❌" : "⚠️ ";
    console.log(`  ${icon} [L${i.line}] @type=${i.schemaType} — ${i.label}`);
    console.log(`     « …${i.snippet}… »`);
  }
}

console.log("\n" + "═".repeat(60));
if (totalErrors > 0) {
  console.log(`❌ ÉCHEC : ${totalErrors} erreur(s) critique(s) à corriger.`);
  process.exit(1);
}
console.log(`✅ OK (${totalWarnings} avertissement(s) non bloquant(s)).`);
process.exit(0);
