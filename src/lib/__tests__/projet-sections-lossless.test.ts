import { describe, it, expect } from "vitest";
import { projetSections, externalRegistrationUrl } from "@/lib/projets";

const CURRENT = "En bref : chantier participatif de plantation Forêt Bleue, 3 000 plants à mettre en terre sur le site de l'entreprise Chantier de l'Arsenal. Lieu : Chef de Baie, La Rochelle. Ce qu'on va faire : végétaliser une partie du terrain. Qui peut participer : les salariés et les citoyens bénévoles. Informations pratiques : accueil à 9h et à 13h30. Inscription sur le formulaire en ligne : https://framaforms.org/chantier-de-plantation-entreprise-foret-bleue-1790081136";

describe("projetSections sans perte", () => {
  it("texte avant le premier libellé : null, affichage intégral", () => {
    expect(projetSections("Attention : bottes nécessaires. Informations pratiques : accueil à 9h.")).toBeNull();
  });
  it("rubrique répétée : null", () => {
    expect(projetSections("Lieu : Lyon. Informations pratiques : 9h. Informations pratiques : 14h.")).toBeNull();
  });
  it("texte sans libellé : null", () => {
    expect(projetSections("Un beau chantier au jardin partagé.")).toBeNull();
  });
  it("annonce actuelle : toutes les rubriques, lien d'inscription conservé", () => {
    const s = projetSections(CURRENT)!;
    expect(Object.keys(s)).toEqual(["En bref", "Lieu", "Ce qu'on va faire", "Qui peut participer", "Informations pratiques"]);
    expect(s["Informations pratiques"]).toContain("https://framaforms.org/chantier-de-plantation-entreprise-foret-bleue-1790081136");
    expect(externalRegistrationUrl(CURRENT)).toBe("https://framaforms.org/chantier-de-plantation-entreprise-foret-bleue-1790081136");
  });
  it("simple lien informatif : pas d'inscription externe", () => {
    expect(externalRegistrationUrl("Plus d'infos : https://exemple.org/projet")).toBeNull();
  });
});
