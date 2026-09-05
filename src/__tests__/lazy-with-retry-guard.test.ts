/**
 * Garde : toute page de route doit charger ses vues avec lazyWithRetry.
 *
 * Un React.lazy nu ne retente rien : après un déploiement, un onglet resté
 * ouvert demande un hash de chunk qui n'existe plus, l'import échoue et
 * l'écran reste bloqué sur son squelette. lazyWithRetry retente puis
 * recharge une fois la page.
 *
 * Lecture disque faite au chargement du module (hors testTimeout).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

const FILES = [...walk(join(ROOT, "src/pages")), join(ROOT, "src/App.tsx")];

const CONTENTS = FILES.map((file) => ({
  file: relative(ROOT, file),
  code: readFileSync(file, "utf8"),
}));

const importsBareLazyFromReact = (code: string): boolean => {
  const matches = code.match(/import\s*\{([^}]*)\}\s*from\s*["']react["']/g) ?? [];
  return matches.some((stmt) => {
    const inner = stmt.slice(stmt.indexOf("{") + 1, stmt.lastIndexOf("}"));
    return inner
      .split(",")
      .map((s) => s.trim())
      .some((s) => s === "lazy" || /^lazy\s+as\s+/.test(s));
  });
};

describe("lazyWithRetry guard", () => {
  it("aucune page n'utilise le lazy de React pour charger un chunk", () => {
    const offenders = CONTENTS.filter(
      ({ code }) => importsBareLazyFromReact(code) && /\blazy\(\s*\(\)\s*=>\s*import\(/.test(code),
    ).map(({ file }) => file);

    expect(
      offenders,
      `Ces fichiers appellent lazy(() => import(...)) avec le lazy de React : ${offenders.join(
        ", ",
      )}. Utilisez import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry" et passez un nom de chunk explicite.`,
    ).toEqual([]);
  });
});
