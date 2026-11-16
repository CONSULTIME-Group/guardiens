/**
 * Lot ES-HOME (16/11/2026, maquette Claude Design « Entraide & sorties, ordinateur
 * et accueil, avant / après », « je valide les maquettes, go » de Jérémie) : les
 * trois familles de l'accueil en un bloc, une phrase, un chiffre vivant et un
 * seul geste chacune ; « Comment ça marche » quitte l'accueil.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOME_FAMILIES, familyCountLine } from "@/components/landing/HomeFamilies";

const read = (path: string) => readFileSync(path, "utf8");
const fr = JSON.parse(read("src/i18n/locales/fr/common.json"));

describe("ES-HOME, familles de l'accueil", () => {
  it("chiffre vivant : jamais un zéro ni une ligne inventée", () => {
    expect(familyCountLine("garde", 20)).toBe("20 gardes ouvertes en ce moment");
    expect(familyCountLine("garde", 1)).toBe("1 garde ouverte en ce moment");
    expect(familyCountLine("garde", 0)).toBeNull();
    expect(familyCountLine("entraide", 12)).toBe("12 coups de main ouverts");
    expect(familyCountLine("entraide", null)).toBeNull();
    expect(familyCountLine("sorties", 0)).toBe("Proposez la première près de chez vous");
    expect(familyCountLine("sorties", 3)).toBe("3 sorties à venir");
  });

  it("un seul bouton plein, celui de la garde, et un lien vers chaque page", () => {
    expect(HOME_FAMILIES.filter((family) => family.primary).map((family) => family.key)).toEqual(["garde"]);
    expect(HOME_FAMILIES.map((family) => family.list)).toEqual(["/annonces", "/petites-missions", "/sorties"]);
    expect(HOME_FAMILIES.map((family) => family.action)).toEqual(["/sits/create", "/petites-missions/creer", "/sorties/proposer"]);
  });

  it("textes affirmatifs, rencontre au choix, sans tiret long", () => {
    const families = fr.landing.families;
    for (const key of ["garde", "entraide", "sorties"]) {
      for (const field of ["title", "text", "cta", "list"]) expect(families[`${key}_${field}`], `${key}_${field}`).toBeTruthy();
    }
    expect(families.entraide_text).toContain("vous convenez ensemble de la suite");
    expect(families.entraide_text).not.toContain("vous vous retrouvez");
    expect(fr.landing.hero.lede).toContain("La rencontre se décide entre vous.");
    expect(JSON.stringify(families)).not.toMatch(/[—–]/);
  });

  it("l'accueil rend le bloc et ne rend plus « Comment ça marche »", () => {
    const landing = read("src/pages/Landing.tsx");
    expect(landing).toContain("<HomeFamilies />");
    expect(landing).not.toContain("HowItWorksSection");
    // L'ancre du sommaire mène au bloc des familles.
    expect(read("src/components/landing/HomeFamilies.tsx")).toContain('id="comment-ca-marche"');
  });
});
