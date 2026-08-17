import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Garde-fou i18n, exécuté en intégration continue avec le reste de la suite
 * Vitest. Depuis le 17/08/2026, Guardiens est monolingue français : les
 * verrous de parité entre dictionnaires ont été retirés avec les langues
 * étrangères. Reste le verrou d'usage : pas de chaîne visible en dur dans
 * les fichiers déjà internationalisés.
 */

/**
 * Fichiers déjà passés par t() sur les parcours publics et d'authentification.
 * Toute nouvelle internationalisation ajoute son fichier ici, ce qui verrouille
 * l'acquis sans faire échouer les écrans encore en français.
 */
const I18N_LOCKED_FILES = [
  "src/components/search/SearchSitter.tsx",
  "src/components/search/SearchOwner.tsx",
];

/** Zones de résultats recensées comme régressives, contrôlées nommément. */
const FORBIDDEN_LITERALS = [
  "annonce${", "annonces disponibles", "Annonces disponibles", "Annonces passées",
  "Trier", "hors France", "Plus proches", "Plus récentes", "Mieux not",
  "gardien trouvé", "gardiens trouvés", "Recherche en cours", "Élargir à ",
];

describe("garde-fou i18n", () => {
  it("les fichiers internationalisés ne réintroduisent pas de chaîne en dur", () => {
    const offenders: string[] = [];
    for (const file of I18N_LOCKED_FILES) {
      const source = fs
        .readFileSync(path.resolve(process.cwd(), file), "utf8")
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");
      for (const literal of FORBIDDEN_LITERALS) {
        if (source.includes(literal)) offenders.push(`${file} : ${literal}`);
      }
    }
    expect(offenders, `chaînes en dur : ${offenders.join(", ")}`).toEqual([]);
  });
});
