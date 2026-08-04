import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";

/**
 * Garde-fou structurel : un seul repère `main` par arbre rendu.
 *
 * Les pages montées sous `PublicShellRoute` (ou sous `AppLayout` pour un
 * utilisateur connecté) sont déjà enveloppées dans le `<main>` de la coquille.
 * Si elles rendent leur propre `<main>`, le document contient deux repères
 * `main`, ce qui est du HTML invalide et casse la navigation d'assistance.
 */

const ROOT = process.cwd();
const APP_PATH = join(ROOT, "src/App.tsx");

const resolveSourcePath = (specifier: string): string => {
  const base = specifier.startsWith("@/")
    ? join(ROOT, "src", specifier.slice(2))
    : join(dirname(APP_PATH), specifier);
  return normalize(extname(base) ? base : `${base}.tsx`);
};

const getPublicShellMountedPages = (): string[] => {
  const app = readFileSync(APP_PATH, "utf8");
  const imports = new Map<string, string>();
  const lazyImportPattern = /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(["']([^"']+)["']\)/g;
  for (const match of app.matchAll(lazyImportPattern)) imports.set(match[1], match[2]);

  const components = new Set<string>();
  const publicShellPattern = /<PublicShellRoute>\s*<(\w+)\b/g;
  for (const match of app.matchAll(publicShellPattern)) components.add(match[1]);

  return [...components].map((component) => {
    const specifier = imports.get(component);
    expect(specifier, `Import lazy introuvable pour ${component}`).toBeTruthy();
    return resolveSourcePath(specifier as string);
  });
};

describe("Structural guard, un seul repere main par arbre rendu", () => {
  it("les pages montees sous PublicShellRoute ne rendent pas de main imbrique", () => {
    const pages = getPublicShellMountedPages();
    expect(pages.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const full of pages) {
      const rel = full.slice(ROOT.length + 1);
      expect(existsSync(full), `Fichier introuvable: ${rel}`).toBe(true);
      const content = readFileSync(full, "utf8");
      const offenders = content.match(/<main\b[^>]*>/g) ?? [];
      if (offenders.length > 0) violations.push(`${rel}: ${offenders.join(", ")}`);
    }

    expect(
      violations,
      `PublicShellRoute fournit deja le main. Utilisez un div dans ces pages:\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
