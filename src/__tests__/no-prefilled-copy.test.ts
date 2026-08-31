import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Règle défendue par ce fichier : aucune interface ne doit écrire à la place
 * d'un membre. Dès qu'un bouton, une pastille ou un modèle remplit un champ
 * ou envoie un message que la personne n'a pas tapé, les annonces et les
 * réponses deviennent identiques d'un membre à l'autre, et le site paraît
 * faux. Mesuré en base : trois membres, trois départements, le même titre et
 * la même contrepartie mot pour mot.
 *
 * Les aides à la rédaction restent, en lecture seule, sur le QUOI dire,
 * jamais sous forme de phrase prête à coller.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const exists = (p: string) => existsSync(resolve(process.cwd(), p));

describe("entraide, aucun texte prêt à coller", () => {
  it("le catalogue de modèles d'annonces n'existe plus", () => {
    expect(exists("src/data/missionTemplates.ts")).toBe(false);
    expect(exists("src/__tests__/mission-templates-money.test.ts")).toBe(false);
  });

  it("missionCategoryCopy n'expose plus de phrases de contrepartie", () => {
    const src = read("src/lib/missionCategoryCopy.ts");
    expect(src).not.toContain("categoryExchangeSuggestions");
    expect(src).not.toContain("Un coup de main en retour quand vous voulez");
    expect(src).toContain("categoryExchangeHint");
  });

  it("la modale de réponse n'a plus de messages types ni d'écriture par clic", () => {
    const src = read("src/components/missions/MissionResponseModal.tsx");
    expect(src).not.toContain("NEED_TEMPLATES");
    expect(src).not.toContain("OFFER_TEMPLATES");
    expect(src).not.toContain("pickTemplate");
    expect(src).not.toMatch(/onClick[^\n]{0,120}setMessage/);
  });

  it("le formulaire de publication ne remplit jamais la contrepartie par clic", () => {
    const src = read("src/pages/CreateSmallMission.tsx");
    expect(src).not.toContain("categoryExchangeSuggestions");
    expect(src).not.toMatch(/onClick[^\n]{0,120}handleExchangeChange/);
    expect(src).not.toMatch(/onClick[^\n]{0,120}setExchangeOffer/);
  });

  it("les constantes d'entraide n'embarquent plus d'exemples prêts à coller", () => {
    expect(read("src/components/missions/connected/constants.ts")).not.toContain("EXAMPLES");
  });

  it("les clés du picker de modèles ont disparu des traductions", () => {
    const json = read("src/i18n/locales/fr/common.json");
    expect(json).not.toContain("templates_");
  });

  it("la fiche ne publie plus de réponse en un clic", () => {
    const src = read("src/pages/SmallMissionDetail.tsx");
    expect(src).not.toContain("handleOneClickInterest");
  });
});
