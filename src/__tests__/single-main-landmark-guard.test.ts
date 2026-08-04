import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou structurel : un seul repère `main` par arbre rendu.
 *
 * Les pages montées sous `PublicShellRoute` (ou sous `AppLayout` pour un
 * utilisateur connecté) sont déjà enveloppées dans le `<main>` de la coquille.
 * Si elles rendent leur propre `<main>`, le document contient deux repères
 * `main`, ce qui est du HTML invalide et casse la navigation d'assistance.
 */

const ROOT = process.cwd();

// Pages montées sous PublicShellRoute dans src/App.tsx.
const SHELL_MOUNTED_PAGES = [
  "src/pages/AlmaEvolution.tsx",
  "src/pages/ArticleInventaire.tsx",
  "src/pages/ArticleDetail.tsx",
  "src/pages/Observatoire.tsx",
  "src/pages/GuideDetail.tsx",
  "src/pages/CityPage.tsx",
  "src/pages/BreedsListing.tsx",
  "src/pages/BreedPage.tsx",
  "src/pages/DepartmentPage.tsx",
  "src/pages/QuestionDetail.tsx",
  "src/pages/InternationalListings.tsx",
  "src/pages/ProCategoryListing.tsx",
  "src/pages/ProDetail.tsx",
  "src/pages/SearchPage.tsx",
];

describe("Structural guard, un seul repere main par arbre rendu", () => {
  for (const rel of SHELL_MOUNTED_PAGES) {
    const full = join(ROOT, rel);
    it(`${rel} ne rend pas de <main> imbrique`, () => {
      expect(existsSync(full), `Fichier introuvable: ${rel}`).toBe(true);
      const content = readFileSync(full, "utf8");
      const offenders = content.match(/<main\b[^>]*>/g) ?? [];
      expect(
        offenders,
        `Cette page est montee dans la coquille (PublicShellRoute ou AppLayout), qui fournit deja le <main>. Utilisez un <div>. Offenders:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  }
});
