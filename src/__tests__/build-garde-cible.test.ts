/**
 * Garde du build (décision du 25/10/2026) : le build rejoue les tests de ce
 * qu'il produit, la CI rejoue la suite complète sur chaque PR et chaque push
 * vers main.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BUILD_GUARD_FILES } from "../../scripts/test-guard/build-guard.mjs";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("garde ciblée du build", () => {
  it("le build se termine par la garde ciblée, sur dist", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts.build).toMatch(/vite build && P2_BUILD_DIR=dist npm run test:guard:build$/);
    expect(pkg.scripts["test:guard:build"]).toBe("node scripts/test-guard/build-guard.mjs");
    expect(pkg.scripts["test:guard"]).toBe("node scripts/test-guard/diff-guard.mjs");
  });

  it("la CI rejoue la suite complète sur chaque PR et chaque push vers main", () => {
    const ci = read(".github/workflows/test-guard.yml");
    expect(ci).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
    expect(ci).toMatch(/pull_request:/);
    expect(ci).toContain("npm run test:guard");
  });

  it("chaque fichier de la garde existe, sans doublon", () => {
    expect(BUILD_GUARD_FILES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(BUILD_GUARD_FILES).size).toBe(BUILD_GUARD_FILES.length);
    for (const f of BUILD_GUARD_FILES) expect(existsSync(resolve(process.cwd(), f)), f).toBe(true);
  });

  it("les tests de llms.txt, du sitemap, de robots.txt, d'index.html et de dist en font partie", () => {
    for (const f of [
      "src/__tests__/seo1/llms-et-gratuite.test.ts",
      "src/__tests__/seo3/live-sitemap.test.ts",
      "src/__tests__/robots-groups.test.ts",
      "src/__tests__/sync-index-html-guard.test.ts",
      "src/__tests__/p2/startup-build.test.ts",
      "src/__tests__/og-apercus-rubriques.test.tsx",
    ]) {
      expect(BUILD_GUARD_FILES).toContain(f);
    }
  });
});
