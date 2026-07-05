import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Garde-fou éditorial (pivot pricing "gratuit sans deadline", 5 juillet 2026).
 *
 * Auparavant, ce fichier vérifiait la cohérence d'une date de bascule tarifaire
 * (1er octobre 2026). Cette date n'existe plus. La promesse publique est :
 *
 *   « Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service. »
 *
 * Ce test bloque donc toute réintroduction accidentelle d'une date de bascule
 * tarifaire dans la copie utilisateur ou dans les fichiers publics.
 */

const ROOT = path.resolve(__dirname, "../..");

const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /1er\s+octobre\s+2026/gi, reason: "Date de bascule '1er octobre 2026' retirée par le pivot pricing." },
  { pattern: /30\s+septembre\s+2026/gi, reason: "Date de bascule '30 septembre 2026' retirée par le pivot pricing." },
  { pattern: /14\s+juillet\s+2026/gi, reason: "Date '14 juillet 2026' retirée par le pivot pricing." },
  { pattern: /15\s+juillet\s+2026/gi, reason: "Date '15 juillet 2026' retirée par le pivot pricing." },
  { pattern: /gratuit\s+jusqu[’']au/gi, reason: "Formule 'gratuit jusqu'au ...' interdite : la gratuité n'a pas de date de fin fixée." },
];

// Chemins racines où la copie utilisateur est susceptible d'exposer des dates.
const SCAN_ROOTS = ["src/pages", "src/components", "public"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".html", ".txt", ".md"]);

// Exclusions : fichiers de migrations historiques (SQL), tests eux-mêmes,
// docs d'audit archivés, JSON i18n hérités (à nettoyer en douceur).
const EXCLUDE = [
  "audit/",
  "supabase/migrations/",
  "__tests__",
  ".test.",
  "src/i18n/",
];

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const full = path.join(dir, entry);
    const rel = path.relative(ROOT, full);
    if (EXCLUDE.some((x) => rel.includes(x))) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXTS.has(path.extname(entry))) out.push(full);
  }
  return out;
};

describe("Pivot pricing 'gratuit sans deadline' — aucune date de bascule dans la copie", () => {
  const files = SCAN_ROOTS
    .map((r) => path.join(ROOT, r))
    .flatMap((p) => walk(p));

  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    it(`ne réintroduit pas /${pattern.source}/`, () => {
      const offenders: string[] = [];
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        if (pattern.test(src)) offenders.push(path.relative(ROOT, f));
      }
      expect(
        offenders,
        `${reason}\nFichiers incriminés :\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  }
});
