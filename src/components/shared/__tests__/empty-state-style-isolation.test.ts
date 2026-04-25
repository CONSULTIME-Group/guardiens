/**
 * Garde-fou anti-divergence — interdit toute redéclaration locale des
 * propriétés de fondu des illustrations EmptyState. La SOURCE UNIQUE est
 * `.illustration-blend` (et son wrapper `.illustration-wrapper`) dans
 * `src/index.css`. Si un futur composant tente de réimplémenter
 * `mask-image`, `mix-blend-mode`, ou un fondu basé sur `hsl(var(--background))`,
 * ce test échoue avec un message qui pointe le fichier fautif.
 *
 * Pourquoi c'est important : la classe `.illustration-blend` est
 * AGNOSTIQUE au token de fond (`--background`, `--card`, `--popover`,
 * `--muted`). Toute redéclaration locale risque de coder en dur un
 * token qui ne correspondra pas au conteneur réel, ce qui fait
 * réapparaître le halo crème — exactement le bug qu'on a passé du
 * temps à éliminer.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// process.cwd() = racine projet sous Vitest.
const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Fichiers EXEMPTÉS — ce sont les SEULS endroits autorisés à parler
 *  de mask-image / mix-blend-mode / .illustration-blend pour les
 *  illustrations EmptyState. */
const ALLOWED = new Set([
  "src/index.css",
  "src/components/shared/EmptyState.tsx",
  "src/components/shared/empty-state-fallbacks.tsx",
  "src/pages/TestEmptyStates.tsx",
  // Tests autorisés à mentionner ces noms à des fins de vérification.
  "src/components/shared/__tests__/empty-state-style-isolation.test.ts",
  "tests/visual/empty-state-halo.spec.ts",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(tsx?|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const FORBIDDEN_PATTERNS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /illustration-blend\s*\{/,
    message:
      "Redéfinition locale de `.illustration-blend`. Source unique : src/index.css.",
  },
  {
    pattern: /(mix-blend-(mode|multiply|screen|overlay))/,
    message:
      "`mix-blend-mode` détecté hors fichier autorisé. Si c'est pour une illustration EmptyState, utilisez la classe `.illustration-blend`.",
  },
  {
    pattern: /(WebkitMaskImage|webkitMaskImage|-webkit-mask-image|mask-image)\s*[:=]/,
    message:
      "`mask-image` détecté hors fichier autorisé. Si c'est pour une illustration EmptyState, utilisez la classe `.illustration-blend`.",
  },
  {
    pattern: /radial-gradient\([^)]*var\(--background\)/,
    message:
      "Fondu radial codant `hsl(var(--background))` en dur. Les illustrations EmptyState DOIVENT rester agnostiques au token de fond — utilisez `.illustration-blend` qui repose sur un masque transparent.",
  },
];

describe("EmptyState style isolation", () => {
  const files = walk(SRC);

  for (const { pattern, message } of FORBIDDEN_PATTERNS) {
    it(`no forbidden pattern: ${pattern}`, () => {
      const violations: string[] = [];
      for (const file of files) {
        const rel = relative(ROOT, file).replace(/\\/g, "/");
        if (ALLOWED.has(rel)) continue;
        const content = readFileSync(file, "utf8");
        if (pattern.test(content)) {
          // Récupère la 1re ligne fautive pour le message d'erreur.
          const line = content
            .split("\n")
            .findIndex((l) => pattern.test(l));
          violations.push(`${rel}:${line + 1}`);
        }
      }
      expect(
        violations,
        `${message}\nFichiers fautifs :\n${violations.join("\n")}`,
      ).toEqual([]);
    });
  }

  it(".illustration-blend exists exactly once in index.css", () => {
    const css = readFileSync(join(SRC, "index.css"), "utf8");
    const matches = css.match(/\.illustration-blend\s*\{/g) ?? [];
    expect(matches.length, "Une seule définition attendue").toBe(1);
  });

  it(".illustration-wrapper exists in index.css (defensive bg-transparent)", () => {
    const css = readFileSync(join(SRC, "index.css"), "utf8");
    expect(css).toMatch(/\.illustration-wrapper\s*\{/);
    expect(css).toMatch(/\.illustration-wrapper[\s\S]{0,200}background:\s*transparent/);
  });
});
