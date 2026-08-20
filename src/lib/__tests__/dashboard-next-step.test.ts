/**
 * dashboardNextStep — « prochain pas » du rail (bloc b), gardien et propriétaire.
 *
 * Verrous produit :
 * - la garde confirmée à venir prime toujours sur les étapes de profil ;
 * - les étapes s'affichent dans l'ordre avatar, bio, code postal ;
 * - la vérification d'identité est le filet, puis la complétion < 100 ;
 * - aucun tiret cadratin dans les chaînes visibles.
 */
import { describe, expect, it } from "vitest";
import { sitterNextStep, ownerNextStep, nextGuardStep } from "../dashboardNextStep";

const NO_DASH = /[—–]/;

const expectNoDash = (content: { title: string; phrase?: string } | null) => {
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
      ownerName: "Claire",
      city: "Annecy",
      pets: [{ species: "dog" }],
      slug: "garde-annecy",
    });
    expect(step.eyebrow).toBe("Votre prochaine garde");
    expect(step.title).toBe("Chez Claire, à Annecy");
    expect(step.phrase).toContain("du 12 juin au 18 juin");
    expect(step.phrase).toContain("chien");
    expect(step.ctaLabel).toBe("Préparer cette garde");
    expect(step.ctaTo).toBe("/sits/garde-annecy");
    expectNoDash(step);
  });

  it("retombe sur le titre générique sans nom ni ville", () => {
    const step = nextGuardStep({ id: "s1", title: "Garde de Luna" });
    expect(step.title).toBe("Garde de Luna");
    expect(step.ctaTo).toBe("/sits/s1");
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
    expect(step?.ctaTo).toBe("/sits/s1");
  });

  it("ordre des étapes : avatar, puis bio, puis code postal", () => {
    expect(sitterNextStep({ ...base, hasAvatar: false })?.title).toBe("Ajoutez une photo de profil");
    expect(sitterNextStep({ ...base, hasBio: false })?.title).toBe("Écrivez votre bio");
    expect(sitterNextStep({ ...base, postalCode: null })?.title).toBe("Confirmez votre code postal");
    expect(sitterNextStep({ ...base, postalCode: null })?.ctaTo).toBe("/sitter-profile?tab=alertes");
  });

  it("la vérification d'identité est le filet avant la complétion", () => {
    const step = sitterNextStep({
      ...base,
      identityAction: { title: "Faites vérifier votre identité", cta: "Vérifier mon identité", href: "/verification-identite" },
    });
    expect(step?.eyebrow).toBe("Votre prochain pas");
    expect(step?.ctaTo).toBe("/verification-identite");
  });

  it("profil complet à 100 : aucune carte", () => {
    expect(sitterNextStep(base)).toBeNull();
  });

  it("profil complet mais < 100 : invitation à compléter avec progression", () => {
    const step = sitterNextStep({ ...base, profileCompletion: 60 });
    expect(step?.title).toBe("Votre profil se complète en quelques minutes.");
    expect(step?.progressPct).toBe(60);
  });

  it(">= 90 % : la touche manquante est nommée précisément", () => {
    const step = sitterNextStep({
      ...base,
      profileCompletion: 97,
      missing: [{ label: "Galerie de 3 photos ou plus", hint: "1 photo pour l'instant." }],
    });
    expect(step?.title).toBe("Une dernière touche à votre profil.");
    expect(step?.phrase).toBe("Reste à faire : galerie de 3 photos ou plus (1 photo pour l'instant).");
    expect(step?.progressPct).toBe(97);
    expectNoDash(step);
  });

  it(">= 90 % sans détail disponible : repli honnête, une touche et pas quelques minutes", () => {
    const step = sitterNextStep({ ...base, profileCompletion: 95 });
    expect(step?.title).toBe("Une dernière touche à votre profil.");
    expect(step?.phrase).toBe("Il ne reste qu'une touche pour compléter votre profil.");
    expectNoDash(step);
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
    expect(step?.title).toBe("Votre profil se complète en quelques minutes.");
    expect(step?.ctaLabel).toBe("Compléter mon profil");
    expect(step?.ctaTo).toBe("/owner-profile");
    expect(step?.progressPct).toBe(40);
    expectNoDash(step);
  });

  it("aucune carte à 100 %", () => {
    expect(ownerNextStep({ profileCompletion: 100 })).toBeNull();
  });

  it(">= 90 % : plusieurs touches manquantes sont listées", () => {
    const step = ownerNextStep({
      profileCompletion: 90,
      missing: [{ label: "Vérification d'identité" }, { label: "Une photo de galerie" }],
    });
    expect(step?.title).toBe("Une dernière touche à votre profil.");
    expect(step?.phrase).toBe("Reste à faire : vérification d'identité, une photo de galerie.");
    expect(step?.ctaTo).toBe("/owner-profile");
    expectNoDash(step);
  });

  it("sous 90 %, l'invitation générique est conservée", () => {
    expect(ownerNextStep({ profileCompletion: 60 })?.title).toBe(
      "Votre profil se complète en quelques minutes.",
    );
  });
});
