import { describe, expect, it } from "vitest";
import { sitterLetterText } from "@/components/profile/sitter/SitterV2Sections";
import { homeFactLabel } from "@/lib/sitterProfileFacts";

describe("FG2, lettre du gardien", () => {
  const bio = "Bonjour, moi c'est Romain ! Passionné d'animaux depuis toujours.";
  it("affiche une seule fois un texte identique", () => {
    expect(sitterLetterText(bio, bio)).toBe(bio);
    expect(sitterLetterText(`${bio} `, `\n${bio}`)).toBe(bio);
  });
  it("garde le texte le plus long quand l'un contient l'autre", () => {
    const long = `${bio} Je viens régulièrement à Paris.`;
    expect(sitterLetterText(long, bio)).toBe(long);
    expect(sitterLetterText(bio, long)).toBe(long);
  });
  it("réunit deux textes différents", () => {
    expect(sitterLetterText("Motivation.", "Présentation.")).toBe("Motivation.\n\nPrésentation.");
    expect(sitterLetterText("", "Présentation.")).toBe("Présentation.");
    expect(sitterLetterText("Motivation.", "")).toBe("Motivation.");
  });
});

describe("FG2, rythme de vie", () => {
  it("affiche le libellé accentué", () => {
    expect(homeFactLabel([], "equilibre")).toBe("Un rythme équilibré");
    expect(homeFactLabel(["Oui, un chat"], "calme")).toBe("Un chat, un rythme calme");
    expect(homeFactLabel([], "actif")).toBe("Un rythme actif");
  });
});
