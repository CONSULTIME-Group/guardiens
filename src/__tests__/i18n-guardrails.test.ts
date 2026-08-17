import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Trois garde-fous i18n, exécutés en intégration continue avec le reste de la
 * suite Vitest :
 *
 * 1. parité des clés entre le français et les deux autres langues,
 * 2. absence de recopie du français dans l'anglais sur les textes longs,
 * 3. absence de chaîne visible en dur dans les fichiers déjà internationalisés
 *    des parcours de priorité 1 et 2.
 */

const LOCALES = path.resolve(process.cwd(), "src/i18n/locales");
const TARGETS = ["en", "es"] as const;

const read = (lng: string) =>
  JSON.parse(fs.readFileSync(path.join(LOCALES, `${lng}/common.json`), "utf8"));

const flatten = (obj: Record<string, unknown>, prefix = "", acc: Record<string, string> = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value as Record<string, unknown>, full, acc);
    } else if (typeof value === "string") {
      acc[full] = value;
    }
  }
  return acc;
};

const fr = flatten(read("fr"));

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

describe("garde-fous i18n", () => {
  it("toute clé française existe dans les deux autres langues", () => {
    const missing: string[] = [];
    for (const lng of TARGETS) {
      const dict = flatten(read(lng));
      for (const key of Object.keys(fr)) {
        if (!(key in dict)) missing.push(`${lng}: ${key}`);
      }
    }
    expect(missing, `clés manquantes : ${missing.slice(0, 20).join(", ")}`).toEqual([]);
  });

  it("aucune valeur anglaise de plus de trois mots n'est identique au français", () => {
    const en = flatten(read("en"));
    const copied = Object.keys(fr).filter((key) => {
      const source = fr[key];
      if (!source || source.split(/\s+/).length <= 3) return false;
      // Les valeurs purement techniques (URL, gabarits) ne sont pas traduisibles.
      if (/^https?:|^\{\{/.test(source)) return false;
      return en[key] === source;
    });
    expect(copied, `traductions anglaises oubliées : ${copied.slice(0, 20).join(", ")}`).toEqual([]);
  });

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
