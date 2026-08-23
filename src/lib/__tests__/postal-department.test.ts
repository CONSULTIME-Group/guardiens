import { describe, it, expect } from "vitest";
import {
  departmentCodeFromPostal,
  postalMatchesDepartment,
} from "../postalDepartment";

// Verrouille la parité front avec la fonction SQL
// recalc_seo_city_page_counts (corrigée le 23/08/2026) : même règle de
// dérivation, mêmes tolérances, sinon badge et grille divergent.
describe("postalDepartment", () => {
  it("déduit le code département du code postal", () => {
    expect(departmentCodeFromPostal("93400")).toBe("93");
    expect(departmentCodeFromPostal("75001")).toBe("75");
    expect(departmentCodeFromPostal("97400")).toBe("974");
    expect(departmentCodeFromPostal("20137")).toBe("20");
    expect(departmentCodeFromPostal("")).toBeNull();
    expect(departmentCodeFromPostal(null)).toBeNull();
    expect(departmentCodeFromPostal(undefined)).toBeNull();
  });

  it("exclut les homonymes hors département (Saint-Denis 93 vs Réunion)", () => {
    expect(postalMatchesDepartment("97410", "93")).toBe(false);
    expect(postalMatchesDepartment("93100", "93")).toBe(true);
    expect(postalMatchesDepartment("97410", "974")).toBe(true);
  });

  it("conserve les profils sans code postal", () => {
    expect(postalMatchesDepartment(null, "93")).toBe(true);
    expect(postalMatchesDepartment("", "93")).toBe(true);
    expect(postalMatchesDepartment(undefined, "93")).toBe(true);
  });

  it("tolérance Corse : 20xxx correspond aux départements 2A et 2B", () => {
    expect(postalMatchesDepartment("20000", "2A")).toBe(true);
    expect(postalMatchesDepartment("20620", "2B")).toBe(true);
    expect(postalMatchesDepartment("20000", "93")).toBe(false);
  });

  it("sans code département résolu, aucun profil n'est exclu", () => {
    expect(postalMatchesDepartment("97410", null)).toBe(true);
    expect(postalMatchesDepartment("97410", undefined)).toBe(true);
    expect(postalMatchesDepartment("93400", "")).toBe(true);
  });
});
