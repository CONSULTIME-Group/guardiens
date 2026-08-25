/**
 * Verrou typographique : `font-serif` n'existe pas dans tailwind.config.ts.
 * Seuls `font-heading` (Playfair Display) et `font-body` (Outfit) sont
 * déclarés. Une classe `font-serif` retombe donc sur Georgia ou Times, pas
 * sur Playfair. Ce test échoue si elle réapparaît dans `src/`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/* Les tests eux-mêmes citent la chaîne pour la verrouiller. */
const ALLOWED = new Set([
  "src/__tests__/no-font-serif-guard.test.ts",
  "src/__tests__/owner-sitter-spotlight.test.tsx",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx?|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe("typographie : aucun font-serif dans src/", () => {
  it("toute police de titre passe par font-heading", () => {
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (ALLOWED.has(rel)) continue;
      const content = readFileSync(file, "utf8");
      if (content.includes("font-serif")) {
        const line = content.split("\n").findIndex((l) => l.includes("font-serif"));
        violations.push(`${rel}:${line + 1}`);
      }
    }
    expect(
      violations,
      `font-serif retombe sur Georgia. Utilisez font-heading.\nFichiers fautifs :\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
