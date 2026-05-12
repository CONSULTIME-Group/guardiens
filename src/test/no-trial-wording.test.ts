/**
 * Garde-fou : interdit toute mention « essai 7 jours » / « 7 jours d'essai » / « période d'essai »
 * dans tout le code applicatif visible (front + edge functions).
 *
 * Règle source : mem://features/no-trial-policy
 * Décision produit : pas de période d'essai 7j. Rassurance via gratuité jusqu'au 14/07/2026,
 * sans engagement, et formule one-shot 10 €.
 *
 * Pour exempter un fichier (formulation négative volontaire type « Absence de période d'essai »
 * dans les CGS), l'ajouter à ALLOWED_FILES avec un commentaire justifiant.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();

/** Répertoires à scanner (texte produit visible utilisateur ou copy serveur). */
const SCAN_DIRS = [
  "src",
  "supabase/functions",
];

/** Extensions analysées. */
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".md"]);

/**
 * Patterns interdits — formulations qui réintroduiraient la promesse d'essai 7 jours.
 * Insensibles à la casse et aux variations d'apostrophe (' vs ’).
 */
const FORBIDDEN_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: "essai 7 jours", regex: /essai\s+(de\s+)?7\s*jours?/i },
  { label: "7 jours d'essai", regex: /7\s*jours?\s+d['’]essai/i },
  { label: "période d'essai", regex: /p[ée]riode\s+d['’]essai/i },
  { label: "essai gratuit", regex: /essai\s+gratuit/i },
  { label: "free trial", regex: /\bfree[-\s]?trial\b/i },
];

/**
 * Fichiers exemptés (chemins relatifs racine, normalisés POSIX).
 * Garder minimal et documenter chaque exception.
 */
const ALLOWED_FILES = new Set<string>([
  // Ce test lui-même : déclare les patterns en chaînes, pas une promesse produit.
  "src/test/no-trial-wording.test.ts",

  // CGS art. 3.2 = clause de NÉGATION explicite « Absence de période d'essai »
  // (formulation juridiquement utile pour cadrer la promesse).
  "src/pages/Cgs.tsx",

  // Migrations DB = historique figé, jamais ré-exécuté contre du contenu vivant.
  // (les migrations contiennent du seed FAQ obsolète, non servi.)
]);

/** Répertoires à ignorer dans le scan. */
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "migrations", // supabase/migrations historiques
]);

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, acc);
    } else {
      const ext = full.slice(full.lastIndexOf("."));
      if (EXTS.has(ext)) acc.push(full);
    }
  }
  return acc;
}

const toPosix = (p: string) => p.split(sep).join("/");

describe("Garde-fou : aucune promesse d'essai 7 jours dans le code", () => {
  it("Aucun fichier visible utilisateur ne contient une mention interdite", () => {
    const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
    const violations: { file: string; pattern: string; line: number; snippet: string }[] = [];

    for (const file of files) {
      const rel = toPosix(relative(ROOT, file));
      if (ALLOWED_FILES.has(rel)) continue;

      let content: string;
      try {
        content = readFileSync(file, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { label, regex } of FORBIDDEN_PATTERNS) {
          if (regex.test(line)) {
            violations.push({
              file: rel,
              pattern: label,
              line: i + 1,
              snippet: line.trim().slice(0, 200),
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const msg = [
        `${violations.length} violation(s) — la promesse « essai 7 jours / période d'essai » est PROSCRITE.`,
        `Règle : mem://features/no-trial-policy`,
        ``,
        ...violations.map(
          (v) => `  ✗ ${v.file}:${v.line}  [${v.pattern}]\n      ${v.snippet}`
        ),
        ``,
        `Si la mention est volontairement négative (ex. clause CGS « Absence de période d'essai »),`,
        `ajouter le fichier à ALLOWED_FILES dans src/test/no-trial-wording.test.ts avec un commentaire.`,
      ].join("\n");
      expect.fail(msg);
    }

    expect(violations).toEqual([]);
  });
});
