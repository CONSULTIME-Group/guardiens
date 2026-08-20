import { describe, it, expect } from "vitest";
import { sitTextMentionsAnimals, shouldPromptAnimalMention } from "../sitAnimalMention";

describe("sitAnimalMention, signal jamais bloquant (décision du 20/08/2026)", () => {
  it("détecte une mention dans le titre, pluriels et majuscules compris", () => {
    expect(sitTextMentionsAnimals({ title: "Garde de mes 2 Chats en août" })).toBe(true);
    expect(sitTextMentionsAnimals({ title: "Vacances, chiens bienvenus" })).toBe(true);
    expect(sitTextMentionsAnimals({ title: "Maison avec chevaux" })).toBe(true);
    expect(sitTextMentionsAnimals({ title: "Près d'un centre NAC" })).toBe(true);
  });

  it("détecte une mention dans les descriptions", () => {
    expect(
      sitTextMentionsAnimals({ absenceReason: "Nous partons et notre lapin reste à la maison." }),
    ).toBe(true);
    expect(
      sitTextMentionsAnimals({ sitterExpectations: "Nourrir le poisson chaque soir." }),
    ).toBe(true);
  });

  it("ne détecte rien sans mention animale", () => {
    expect(sitTextMentionsAnimals({ title: "Garde de maison avec jardin" })).toBe(false);
    expect(
      sitTextMentionsAnimals({ title: "Maison calme", absenceReason: "Déplacement professionnel." }),
    ).toBe(false);
    expect(sitTextMentionsAnimals({})).toBe(false);
    expect(sitTextMentionsAnimals({ title: "   " })).toBe(false);
  });

  it("le signal n'apparaît que si le texte parle d'animaux ET la fiche est vide", () => {
    const withMention = { title: "Garde de mon chat" };
    expect(shouldPromptAnimalMention(withMention, 0)).toBe(true);
    expect(shouldPromptAnimalMention(withMention, 2)).toBe(false);
    expect(shouldPromptAnimalMention({ title: "Garde de maison" }, 0)).toBe(false);
  });
});
