/**
 * dashboardNextStep — « prochain pas » du rail (bloc b), gardien et propriétaire.
 *
 * Verrous produit :
 * - la garde confirmée à venir prime toujours sur les étapes de profil ;
 * - les étapes s'affichent dans l'ordre avatar, bio, code postal ;
 * - la vérification d'identité est le filet final ;
 * - aucune carte quand tout est en règle (sauf propriétaire : profil < 100) ;
 * - aucun tiret cadratin dans les chaînes visibles.
 */
import { describe, expect, it } from "vitest";
import { sitterNextStep, ownerNextStep, nextGuardStep } from "../dashboardNextStep";

const NO_DASH = /[—–]/;

const expectNoDash = (content: { title: string; phrase?: string | null } | null) => {
  if (!content) return;
  expect(content.title).not.toMatch(NO_DASH);
  if (content.phrase) expect(content.phrase).not.toMatch(NO_DASH);
};

describe("nextGuardStep", () => {
  it("compose la prochaine garde (prénom, ville, dates, animaux)", () => {
    const step = nextGuardStep({
      id: "s1",
      start_date: "2026-06-12",
      end_date: "2026-06-18",
      sitter_first_name: "claire",
      city: "Annecy",
      animals: ["chien"],
      slug: "garde-annecy",
    });
    expect(step.eyebrow).toBe("Votre prochaine garde");
    expect(step.title).toBe("Chez Claire, à Annecy");
    expect(step.phrase).toContain("du 12 juin au 18 juin");
    expect(step.phrase).toContain("chien");
    expect(step.cta).toBe("Voir la garde");
    expect(step.href).toBe("/sits/garde-annecy");
    expect(step.progressPct).toBeNull();
    expectNoDash(step);
  });

  it("rejette une garde sans dates", () => {
    expect(nextGuardStep({ id: "s1" })).toBeNull();
  });
});

describe("sitterNextStep", () => {
  const base = {
    nextGuard: null,
    postalCode: "69003",
    hasAvatar: true,
    hasBio: true,
    identityAction: null,
    profileCompletion: 100,
  };

  it("la garde confirmée à venir prime sur toutes les étapes", () => {
    const step = sitterNextStep({
      ...base,
      hasAvatar: false,
      hasBio: false,
      postalCode: null,
      nextGuard: { id: "s1", start_date: "2026-06-12", end_date: "2026-06-18", title: "Garde de Luna" },
    });
    expect(step?.eyebrow).toBe("Votre prochaine garde");
    expect(step?.title).toBe("Garde de Luna");
    expect(step?.href).toBe("/sits/s1");
  });

  it("ordre des étapes : avatar, puis bio, puis code postal", () => {
    expect(sitterNextStep({ ...base, hasAvatar: false })?.href).toBe("/sitter-profile");
    expect(sitterNextStep({ ...base, hasAvatar: false })?.phrase).toContain("photo");
    expect(sitterNextStep({ ...base, hasBio: false })?.phrase).toContain("mots");
    expect(sitterNextStep({ ...base, postalCode: null })?.title).toBe("Dites-nous où vous êtes.");
    expect(sitterNextStep({ ...base, postalCode: null })?.href).toBe("/profile/edit#location");
  });

  it("la vérification d'identité est le filet final", () => {
    const step = sitterNextStep({
      ...base,
      identityAction: { title: "Faites vérifier votre identité", cta: "Vérifier mon identité", href: "/verification-identite" },
    });
    expect(step?.eyebrow).toBe("Votre prochain pas");
    expect(step?.href).toBe("/verification-identite");
  });

  it("aucune carte quand tout est en règle", () => {
    expect(sitterNextStep(base)).toBeNull();
  });

  it("aucun tiret cadratin dans les contenus", () => {
    [
      sitterNextStep({ ...base, hasAvatar: false }),
      sitterNextStep({ ...base, hasBio: false }),
      sitterNextStep({ ...base, postalCode: null }),
    ].forEach(expectNoDash);
  });
});

describe("ownerNextStep", () => {
  it("propose de compléter le profil sous 100 %, avec progression", () => {
    const step = ownerNextStep({ profileCompletion: 40 });
    expect(step?.eyebrow).toBe("Votre prochain pas");
    expect(step?.title).toBe("Complétez votre profil.");
    expect(step?.cta).toBe("Compléter mon profil");
    expect(step?.href).toBe("/owner-profile");
    expect(step?.progressPct).toBe(40);
    expectNoDash(step);
  });

  it("aucune carte à 100 %", () => {
    expect(ownerNextStep({ profileCompletion: 100 })).toBeNull();
  });
});
