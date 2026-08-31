import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Non-régression : aucun texte prêt à coller ne doit revenir dans l'entraide.
 * Trois membres affichaient le même titre et la même contrepartie, mot pour
 * mot, parce que l'interface écrivait à leur place.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("entraide, aucun texte prêt à coller", () => {
  it("le catalogue de modèles d'annonces n'existe plus", () => {
    expect(existsSync(resolve(process.cwd(), "src/data/missionTemplates.ts"))).toBe(false);
  });

  it("missionCategoryCopy n'expose plus de phrases de contrepartie", () => {
    const src = read("src/lib/missionCategoryCopy.ts");
    expect(src).not.toContain("categoryExchangeSuggestions");
    expect(src).not.toContain("Un coup de main en retour quand vous voulez");
    expect(src).toContain("categoryExchangeHint");
  });

  it("la modale de réponse n'a plus de messages types", () => {
    const src = read("src/components/missions/MissionResponseModal.tsx");
    expect(src).not.toContain("NEED_TEMPLATES");
    expect(src).not.toContain("OFFER_TEMPLATES");
  });

  it("la fiche ne publie plus de réponse en un clic", () => {
    const src = read("src/pages/SmallMissionDetail.tsx");
    expect(src).not.toContain("handleOneClickInterest");
  });
});
