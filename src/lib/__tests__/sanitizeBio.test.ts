import { describe, it, expect } from "vitest";
import { sanitizeBioForCard } from "../sanitizeBio";

describe("sanitizeBioForCard", () => {
  it("masque les emails", () => {
    expect(sanitizeBioForCard("contactez moi à jean@exemple.fr svp"))
      .toBe("contactez moi à [contact masqué] svp");
  });

  it("masque les numéros de téléphone FR", () => {
    expect(sanitizeBioForCard("Appelez 06 12 34 56 78")).toContain("[contact masqué]");
    expect(sanitizeBioForCard("Tel: 06.12.34.56.78")).toContain("[contact masqué]");
    expect(sanitizeBioForCard("+33 6 12 34 56 78")).toContain("[contact masqué]");
  });

  it("ne masque pas les petits nombres", () => {
    expect(sanitizeBioForCard("J'ai 2 chats et 1 chien")).toBe("J'ai 2 chats et 1 chien");
  });

  it("masque les URLs et domaines", () => {
    expect(sanitizeBioForCard("Mon site https://moi.fr")).toContain("[lien masqué]");
    expect(sanitizeBioForCard("Voir monsite.com")).toContain("[lien masqué]");
  });

  it("masque les handles sociaux", () => {
    expect(sanitizeBioForCard("Suivez @monpseudo")).toContain("[contact masqué]");
  });

  it("renvoie chaîne vide pour null/undefined", () => {
    expect(sanitizeBioForCard(null)).toBe("");
    expect(sanitizeBioForCard(undefined)).toBe("");
  });

  it("préserve une bio propre", () => {
    const bio = "Passionnée d'animaux, deux chats et un jardin. Disponible le week-end.";
    expect(sanitizeBioForCard(bio)).toBe(bio);
  });
});
