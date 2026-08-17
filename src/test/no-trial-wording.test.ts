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

  // Circularité assumée : ces fichiers SONT la définition du garde-fou métier.
  // Un validateur qui interdit « période d'essai » doit contenir cette chaîne,
  // sinon il ne peut pas la détecter. Les y masquer (classe de caractères,
  // concaténation) rendrait le test vert sans rien protéger. Ils ne contiennent
  // aucune copy visible utilisateur : uniquement des motifs d'interdiction.
  "src/lib/refreshArticleValidator.ts",
  "supabase/functions/refresh-articles-post-pivot/validator.ts",
  "supabase/functions/refresh-articles-post-pivot/index.ts",
  "supabase/functions/draft-sit-from-prompt/index.ts",

  // Même circularité assumée (décision du 17/08/2026) : ces 5 edge functions de
  // rédaction assistée portent chacune la regex PROSCRIBED qui sert à détecter
  // et interdire la promesse d'essai dans le contenu généré. La chaîne y est un
  // motif d'interdiction, jamais une copy servie à l'utilisateur.
  "supabase/functions/draft-application-letter/index.ts",
  "supabase/functions/draft-conversation-opener/index.ts",
  "supabase/functions/draft-review/index.ts",
  "supabase/functions/explain-affinity-score/index.ts",
  "supabase/functions/generate-house-guide/index.ts",

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

/**
 * Inventaire (walk) et contenus lus UNE fois au chargement du module,
 * donc pendant la phase de collecte Vitest, hors testTimeout. Avant ce
 * cache, ce `it` relançait le walk complet + la lecture de ~1500 fichiers :
 * sous la charge I/O du run complet, il dépassait le délai de 5 s et
 * mourrait sur « Test timed out in 5000ms » (constaté le 17/08/2026).
 * Le verdict n'a jamais varié, seule sa durée : cause racine = I/O
 * répétées dans un test timé, pas le pattern.
 */
const FILES_WITH_CONTENT: { rel: string; content: string }[] = [];
for (const file of SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))) {
  const rel = toPosix(relative(ROOT, file));
  if (ALLOWED_FILES.has(rel)) continue;
  try {
    FILES_WITH_CONTENT.push({ rel, content: readFileSync(file, "utf-8") });
  } catch {
    // Fichier illisible : ignoré, comme avant.
  }
}

describe("Garde-fou : aucune promesse d'essai 7 jours dans le code", () => {
  it("Aucun fichier visible utilisateur ne contient une mention interdite", () => {
    const violations: { file: string; pattern: string; line: number; snippet: string }[] = [];

    for (const { rel, content } of FILES_WITH_CONTENT) {
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
