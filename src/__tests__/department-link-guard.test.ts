import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Verrou maillage interne /departement/ :
 * 1. Aucun lien département ne doit être construit par une expression en ligne
 *    (toLowerCase/replace) qui ne retire pas les accents. Seul slugify
 *    (src/lib/normalize) ou un slug déjà vérifié en base sont admis.
 * 2. Tout lien département construit depuis une donnée de contenu via slugify
 *    doit être protégé par useDepartmentPageExists (page publiée existante),
 *    sinon le lien tombe en 404 crawlable.
 */

const SRC = join(__dirname, "..");

const collectFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "admin") continue;
      out.push(...collectFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
};

const files = collectFiles(SRC);
const LINK_RE = /\/departement\/\$\{([^}]+)\}/g;

describe("department-link-guard", () => {
  it("aucun lien /departement/ construit par expression en ligne (accents non retirés)", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const match of content.matchAll(LINK_RE)) {
        const expr = match[1];
        if (/\.(toLowerCase|replace|normalize)\(/.test(expr)) {
          offenders.push(`${relative(SRC, file)}: ${expr}`);
        }
      }
    }
    expect(offenders, `Liens département non normalisés:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("tout lien /departement/ construit via slugify est protégé par useDepartmentPageExists", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const buildsFromContent = [...content.matchAll(LINK_RE)].some((m) =>
        m[1].includes("slugify(")
      );
      if (buildsFromContent && !content.includes("useDepartmentPageExists")) {
        offenders.push(relative(SRC, file));
      }
    }
    expect(
      offenders,
      `Liens département sans vérification d'existence:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("CityPage normalise via slugify, passe departmentSlug à CityHero et protège le lien de maillage", () => {
    const src = readFileSync(join(SRC, "pages/CityPage.tsx"), "utf8");
    expect(src).toContain('import { slugify } from "@/lib/normalize"');
    expect(src).toContain("useDepartmentPageExists");
    expect(src).toContain("departmentSlug={departmentPageExists");
    expect(src).toMatch(/departmentPageExists && departmentSlug && \(/);
  });

  it("GuideDetail ne rend le lien département que si la page publiée existe", () => {
    const src = readFileSync(join(SRC, "pages/GuideDetail.tsx"), "utf8");
    expect(src).toContain("useDepartmentPageExists");
    expect(src).toContain("guide.department && hasDepartmentPage && (");
  });
});
