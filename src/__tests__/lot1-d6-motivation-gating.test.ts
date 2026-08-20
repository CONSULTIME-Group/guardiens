import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { publishableMotivation, MOTIVATION_MIN_LENGTH } from "@/lib/motivation";

/**
 * D6 : la contrainte de longueur de la motivation (>= 50) ne bloque que la
 * publication du champ, jamais l'enregistrement des autres champs de la page.
 */
describe("D6 : la motivation ne gèle plus l'enregistrement", () => {
  it("publishableMotivation masque les brouillons sous le seuil", () => {
    expect(MOTIVATION_MIN_LENGTH).toBe(50);
    expect(publishableMotivation(null)).toBe("");
    expect(publishableMotivation("")).toBe("");
    expect(publishableMotivation("   ".padEnd(60, " "))).toBe("");
    expect(publishableMotivation("trop court")).toBe("");
    expect(publishableMotivation("x".repeat(49))).toBe("");
    expect(publishableMotivation("x".repeat(50))).toBe("x".repeat(50));
  });

  it("canSave du profil gardien ne dépend plus de la motivation", () => {
    const page = readFileSync("src/pages/SitterProfile.tsx", "utf8");
    expect(page).not.toContain("motivationBlocks");
    expect(page).not.toContain("motivationBeingEdited");
    expect(page).toContain("const canSave = !saving && dirty;");
  });

  it("la fiche publique passe par le garde publishableMotivation", () => {
    const publicPage = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");
    expect(publicPage).toContain("publishableMotivation");
  });
});
