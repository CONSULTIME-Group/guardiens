import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { readFileSync } from "fs";

/**
 * D7 : le nom de famille n'est plus listé comme champ manquant, et les
 * fonctions compute*MissingFields inutilisées sont supprimées (le barème
 * serveur calculate_profile_completion et useProfileCompletionMissing
 * restent les seules sources de complétude).
 */
describe("D7 : plus de champs manquants fantômes", () => {
  it("aucune référence aux fonctions compute*MissingFields supprimées", () => {
    const out = execSync(
      `rg -l "computeSitterMissingFields|computeOwnerMissingFields|computeMissingFields" src --glob '!**/__tests__/**' || true`,
      { encoding: "utf8" },
    ).trim();
    expect(out).toBe("");
  });

  it("les deux pages profil ne consomment plus missingFields", () => {
    for (const p of ["src/pages/SitterProfile.tsx", "src/pages/OwnerProfile.tsx"]) {
      expect(readFileSync(p, "utf8")).not.toContain("missingFields");
    }
  });

  it("les hooks n'exposent plus missingFields", () => {
    for (const h of ["src/hooks/useSitterProfile.ts", "src/hooks/useOwnerProfile.ts"]) {
      expect(readFileSync(h, "utf8")).not.toContain("missingFields");
    }
  });
});
