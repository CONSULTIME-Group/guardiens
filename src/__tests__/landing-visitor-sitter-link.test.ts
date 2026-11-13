import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Lot HOME1 (13/11/2026, décision de Jérémie) : le hero porte un seul bouton.
// Le choix « je cherche un gardien » ou « je veux garder » se fait à
// l'étape 1 de l'inscription, le lien gardien quitte donc le hero.
describe("hero de la home : un seul geste", () => {
  const source = readFileSync("src/pages/Landing.tsx", "utf8");
  const hero = source.slice(source.indexOf("SECTION 1, HERO"), source.indexOf("BANDE CHIFFRES"));

  it("propose un seul bouton, l'inscription pour un visiteur", () => {
    expect(hero.match(/<Button/g)?.length).toBe(1);
    // Un vrai lien, lisible par les moteurs.
    expect(hero).toContain('to={isMember ? "/sits/create" : "/inscription"}');
    expect(hero).toContain('t("landing.hero.cta_signup")');
  });

  it("garde le compteur de proximité et retire les liens secondaires", () => {
    expect(hero).toContain("<HomeProximitySearch");
    expect(hero).not.toContain("/inscription?role=sitter");
    expect(hero).not.toContain("/petites-missions/creer");
  });
});
