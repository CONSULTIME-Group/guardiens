/**
 * Rappel J-7 : le gardien doit arriver préparé.
 *
 * On couvre la résolution des liens de préparation (fiche de race de
 * l'animal gardé, guide de la ville de la garde) et les garde-fous du
 * gabarit : branche propriétaire strictement inchangée, aucun lien mort,
 * aucune URL relative.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveSitPrepLinks } from "../../supabase/functions/_shared/breeds/sitPrepLinks";

const TEMPLATE = readFileSync(
  resolve(
    __dirname,
    "../../supabase/functions/_shared/transactional-email-templates/sit-reminder-j7.tsx",
  ),
  "utf8",
);

const CANDIDATES = [
  { species: "cat", breed: "européen" },
  { species: "dog", breed: "labrador retriever" },
];

const ANNECY = { slug: "annecy", city: "Annecy" };

describe("liens de préparation du rappel J-7", () => {
  it("race avec fiche et ville avec guide publié : les deux liens", () => {
    const prep = resolveSitPrepLinks(
      [{ species: "cat", breed: "Gouttière" }],
      CANDIDATES,
      ANNECY,
    );
    expect(prep.breedGuidePath).toBe("/races/cat-europeen");
    expect(prep.breedGuideName).toBe("européen");
    expect(prep.cityGuidePath).toBe("/guides/annecy");
    expect(prep.cityGuideName).toBe("Annecy");
  });

  it("race sans fiche : aucun lien de race, le guide de ville subsiste", () => {
    const prep = resolveSitPrepLinks(
      [{ species: "dog", breed: "Berger des Carpates" }],
      CANDIDATES,
      ANNECY,
    );
    expect(prep.breedGuidePath).toBeUndefined();
    expect(prep.breedGuideName).toBeUndefined();
    expect(prep.cityGuidePath).toBe("/guides/annecy");
  });

  it("ville sans guide publié : aucun lien de ville", () => {
    const prep = resolveSitPrepLinks(
      [{ species: "dog", breed: "Labrador" }],
      CANDIDATES,
      null,
    );
    expect(prep.breedGuidePath).toBe("/races/dog-labrador-retriever");
    expect(prep.cityGuidePath).toBeUndefined();
    expect(prep.cityGuideName).toBeUndefined();
  });

  it("aucune race renseignée : aucun lien de race", () => {
    const prep = resolveSitPrepLinks(
      [{ species: "cat", breed: null }, { species: null, breed: "Labrador" }],
      CANDIDATES,
      null,
    );
    expect(prep).toEqual({});
  });

  it("aucun animal : objet vide, le gabarit garde sa forme actuelle", () => {
    expect(resolveSitPrepLinks(undefined, CANDIDATES, null)).toEqual({});
  });

  it("le slug de ville vient de city_guides, jamais reconstruit", () => {
    const prep = resolveSitPrepLinks([], CANDIDATES, {
      slug: "aix-les-bains",
      city: "Aix-les-Bains",
    });
    expect(prep.cityGuidePath).toBe("/guides/aix-les-bains");
  });
});

describe("gabarit sit-reminder-j7", () => {
  it("les liens de préparation sont réservés à la branche gardien", () => {
    expect(TEMPLATE).toContain("const breedUrl = isOwner ? null : absolute(breedGuidePath)");
    expect(TEMPLATE).toContain("const cityUrl = isOwner ? null : absolute(cityGuidePath)");
  });

  it("aucun bloc n'est rendu si aucun lien n'est disponible", () => {
    expect(TEMPLATE).toContain(
      "const showPrep = Boolean((breedUrl && breedGuideName) || (cityUrl && cityGuideName))",
    );
    expect(TEMPLATE).toContain("{showPrep && (");
  });

  it("aucune URL relative ne peut se glisser dans l'email", () => {
    // Tout href passe soit par SITE_URL, soit par absolute() qui préfixe.
    const hrefs = TEMPLATE.match(/href=\{[^}]+\}/g) ?? [];
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toMatch(/SITE_URL|breedUrl|cityUrl/);
    }
    expect(TEMPLATE).toContain("if (!path.startsWith('/')) return null");
    expect(TEMPLATE).toContain("return `${SITE_URL}${path}`");
    expect(TEMPLATE).not.toMatch(/href="\//);
  });

  it("le bouton principal reste le seul bouton, les guides sont des liens texte", () => {
    expect((TEMPLATE.match(/<Button/g) ?? []).length).toBe(1);
    expect(TEMPLATE).toContain("<Link style={inlineLink}");
  });

  it("aucune incitation promotionnelle, base légale 6.1.b préservée", () => {
    expect(TEMPLATE).toContain('basis="6.1.b"');
    expect(TEMPLATE).not.toMatch(/nos autres guides|Découvrez/i);
  });

  it("previewData couvre le cas gardien avec race et ville", () => {
    expect(TEMPLATE).toContain("breedGuidePath: '/races/cat-europeen'");
    expect(TEMPLATE).toContain("cityGuidePath: '/guides/annecy'");
  });
});
