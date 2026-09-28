import { describe, it, expect } from "vitest";
import { normalizeContactMessage } from "@/lib/normalizeContactMessage";

describe("normalizeContactMessage", () => {
  it("retire les espaces invisibles d'un collage de traitement de texte", () => {
    const raw = "Ligne un" + " ".repeat(400) + "\n" + " ".repeat(300) + "Ligne deux\n\n\n\nLigne trois";
    expect(normalizeContactMessage(raw)).toBe("Ligne un\nLigne deux\n\nLigne trois");
  });

  it("remplace espaces insécables et tabulations par un espace simple", () => {
    const raw = "\u00A0Association\u00A0\u00A0des\u202Famis\tdu\t\tquartier\u202F";
    expect(normalizeContactMessage(raw)).toBe("Association des amis du quartier");
  });

  it("renvoie une chaîne vide pour un texte vide ou blanc", () => {
    expect(normalizeContactMessage("")).toBe("");
    expect(normalizeContactMessage(" \t\u00A0\n\n ")).toBe("");
  });
});
