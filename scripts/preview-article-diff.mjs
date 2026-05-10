#!/usr/bin/env node
/**
 * Preview éditorial — affiche le diff d'une modification d'article AVANT UPDATE.
 *
 * Usage :
 *   node scripts/preview-article-diff.mjs <slug> <patch.json>
 *
 * patch.json :
 *   {
 *     "content_replace": [{ "search": "...", "replace": "..." }],
 *     "meta_title": "…",          // optionnel
 *     "meta_description": "…",    // optionnel
 *     "canonical_url": "…"        // optionnel
 *   }
 *
 * Le script :
 *   1) Charge la version actuelle depuis Postgres (psql)
 *   2) Applique les replace en mémoire
 *   3) Affiche un diff unifié + le JSON-LD FAQPage simulé
 *   4) N'écrit JAMAIS en base — la décision revient à l'humain
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createTwoFilesPatch } from "diff";
import { parseFaqFromMarkdown, buildFaqSchema } from "../src/lib/parseFaq.ts";

const [, , slug, patchPath] = process.argv;
if (!slug || !patchPath) {
  console.error("Usage: node scripts/preview-article-diff.mjs <slug> <patch.json>");
  process.exit(1);
}

const patch = JSON.parse(readFileSync(patchPath, "utf8"));
const sqlSlug = slug.replace(/'/g, "''");
const current = JSON.parse(
  execSync(
    `psql -At -c "SELECT row_to_json(t) FROM (SELECT content, meta_title, meta_description, canonical_url FROM articles WHERE slug='${sqlSlug}') t"`,
  ).toString().trim(),
);

let next = { ...current };
if (Array.isArray(patch.content_replace)) {
  for (const { search, replace } of patch.content_replace) {
    if (!next.content.includes(search)) {
      console.error(`❌ Ancrage introuvable :\n${search.slice(0, 200)}…`);
      process.exit(2);
    }
    next.content = next.content.split(search).join(replace);
  }
}
for (const k of ["meta_title", "meta_description", "canonical_url"]) {
  if (patch[k] !== undefined) next[k] = patch[k];
}

console.log(`\n=== DIFF — ${slug} ===\n`);
for (const k of ["meta_title", "meta_description", "canonical_url"]) {
  if (current[k] !== next[k]) {
    console.log(`• ${k}: "${current[k] ?? ""}" → "${next[k] ?? ""}" (${(next[k] ?? "").length} chars)`);
  }
}
if (current.content !== next.content) {
  console.log(createTwoFilesPatch("content (avant)", "content (après)", current.content, next.content, "", "", { context: 2 }));
}

const before = parseFaqFromMarkdown(current.content);
const after = parseFaqFromMarkdown(next.content);
console.log(`\n=== JSON-LD FAQPage ===`);
console.log(`Avant : ${before.length} Q/R | Après : ${after.length} Q/R`);
const schema = buildFaqSchema(after);
if (schema) {
  console.log(`Schema valide : @type=${schema["@type"]}, ${schema.mainEntity.length} entrées`);
  after.forEach((it, i) => console.log(`  Q${i + 1}: ${it.question.slice(0, 90)}`));
}

const banned = [/\bvoisin/i, /\bAURA\b/, /Auvergne-Rhône-Alpes/i];
const hits = banned.flatMap((re) => {
  const m = next.content.match(re);
  return m ? [m[0]] : [];
});
if (hits.length) console.log(`\n⚠️ Mots proscrits détectés : ${hits.join(", ")}`);

console.log(`\n=== ATTENTE VALIDATION HUMAINE — aucune écriture en base ===`);
