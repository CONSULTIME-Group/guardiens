import { describe, it, expect } from "vitest";
import { sanitizeBioForCard, sanitizeBioForPublic } from "../sanitizeBio";

describe("sanitizeBioForCard", () => {
  it("masque les emails", () => {
    expect(sanitizeBioForCard("contactez moi à jean@exemple.fr svp"))
      .toBe("contactez moi à [contact masqué] svp");
  });

  it("masque les numéros de téléphone FR", () => {
    expect(sanitizeBioForCard("Appelez 06 12 34 56 78")).toContain("[contact masqué]");
    expect(sanitizeBioForCard("Tel: 06.12.34.56.78")).toContain("[contact masqué]");
    expect(sanitizeBioForCard("Tel: 06-12-34-56-78")).toContain("[contact masqué]");
    expect(sanitizeBioForCard("0612345678")).toContain("[contact masqué]");
    expect(sanitizeBioForCard("+33 6 12 34 56 78")).toContain("[contact masqué]");
    expect(sanitizeBioForCard("+41 79 123 45 67")).toContain("[contact masqué]");
  });

  it("ne masque pas les petits nombres", () => {
    expect(sanitizeBioForCard("J'ai 2 chats et 1 chien")).toBe("J'ai 2 chats et 1 chien");
  });

  it("masque les URLs et domaines", () => {
    expect(sanitizeBioForCard("Mon site https://moi.fr")).toContain("[lien masqué]");
    expect(sanitizeBioForCard("Voir monsite.com")).toContain("[lien masqué]");
    expect(sanitizeBioForCard("Voir mon-site.fr pour plus")).toContain("[lien masqué]");
  });

  it("masque les handles sociaux", () => {
    expect(sanitizeBioForCard("Suivez @moncompte")).toContain("[contact masqué]");
  });

  it("renvoie chaîne vide pour null/undefined", () => {
    expect(sanitizeBioForCard(null)).toBe("");
    expect(sanitizeBioForCard(undefined)).toBe("");
  });

  it("préserve une bio propre", () => {
    const bio = "Passionnée d'animaux, deux chats et un jardin. Disponible le week-end.";
    expect(sanitizeBioForCard(bio)).toBe(bio);
  });

  it("retire les emoji", () => {
    expect(sanitizeBioForCard("J'aime les chiens 🐶 et les chats")).toBe("J'aime les chiens et les chats");
  });
});

describe("faux positifs corrigés", () => {
  it("ne masque pas une phrase française sans espace après le point", () => {
    expect(sanitizeBioForPublic("J'aime les animaux.De plus je suis disponible."))
      .toBe("J'aime les animaux.De plus je suis disponible.");
    expect(sanitizeBioForPublic("Trois chats.Il faut les nourrir."))
      .toBe("Trois chats.Il faut les nourrir.");
  });

  it("ne masque pas les dates", () => {
    expect(sanitizeBioForPublic("Disponible du 12 03 2026")).toBe("Disponible du 12 03 2026");
    expect(sanitizeBioForPublic("Disponible le 12.03.2026")).toBe("Disponible le 12.03.2026");
    expect(sanitizeBioForPublic("Disponible le 12/03/2026")).toBe("Disponible le 12/03/2026");
    expect(sanitizeBioForPublic("Absente du 12/03/2026 au 20/03/2026"))
      .toBe("Absente du 12/03/2026 au 20/03/2026");
  });
});

describe("sanitizeBioForPublic", () => {
  it("conserve les emoji", () => {
    expect(sanitizeBioForPublic("J'aime les chiens 🐶")).toBe("J'aime les chiens 🐶");
  });

  it("masque quand même les coordonnées", () => {
    expect(sanitizeBioForPublic("06 12 34 56 78 ou jean@exemple.fr"))
      .toBe("[contact masqué] ou [contact masqué]");
  });

  it("renvoie chaîne vide pour null", () => {
    expect(sanitizeBioForPublic(null)).toBe("");
  });
});
