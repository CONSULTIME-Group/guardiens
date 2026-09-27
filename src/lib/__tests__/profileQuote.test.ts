import { describe, it, expect } from "vitest";
import { pickProfileQuote } from "@/lib/profileQuote";

const KRYSTINA_BIO = `Femme, seule travaillant dans l’entretien le matin en semaine jusqu’à 14 heures maximum en semaine uniquement relativement disponible après ces horaires-là
Agent de sécurité en parallèle carte pro à jour j’ai commencé comme maître Chien, j’ai travaillé comme palefrenier étant jeune, j’ai eu des NAC des chats des chiens 
J’apprécie la compagnie de tous les animaux`;

describe("pickProfileQuote", () => {
  it("Krystina : première phrase en « J » de 20 à 120 caractères", () => {
    expect(pickProfileQuote(KRYSTINA_BIO, null)).toBe("J’apprécie la compagnie de tous les animaux");
  });
  it("aucune phrase en « J » : null", () => {
    expect(pickProfileQuote("Passionnée par les chats. Disponible le week-end.", "Retraitée, calme et attentive.")).toBeNull();
  });
  it("phrase de plus de 120 caractères ignorée", () => {
    const long = "Je " + "garde des animaux avec beaucoup de plaisir et de patience ".repeat(3) + ".";
    expect(long.length).toBeGreaterThan(120);
    expect(pickProfileQuote(long, "Je réponds vite et avec plaisir.")).toBe("Je réponds vite et avec plaisir.");
  });
});
