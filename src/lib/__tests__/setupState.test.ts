import { describe, it, expect } from "vitest";
import { resolveSetupState, type SetupStateInput } from "../setupState";

const base: SetupStateInput = {
  loading: false,
  hasProperty: false,
  hasPets: false,
  hasPhoto: false,
  entered: true,
  dismissed: false,
  voluntary: false,
};

describe("resolveSetupState", () => {
  it("liste les deux prérequis bloquants quand rien n'est renseigné", () => {
    const s = resolveSetupState(base);
    expect(s.showSetup).toBe(true);
    expect(s.missingIds).toEqual(["property", "photo"]);
    expect(s.canContinue).toBe(false);
    expect(s.canGoBack).toBe(false);
  });

  it("retire les prérequis un par un à mesure qu'ils sont comblés", () => {
    const withProperty = resolveSetupState({ ...base, hasProperty: true });
    expect(withProperty.missingIds).toEqual(["photo"]);
    expect(withProperty.housingDone).toBe(true);
    expect(withProperty.canContinue).toBe(false);

    // Les animaux ne sont pas un prérequis : logement et photo suffisent.
    const withoutPets = resolveSetupState({ ...base, hasProperty: true, hasPhoto: true });
    expect(withoutPets.missingIds).toEqual([]);
    expect(withoutPets.canContinue).toBe(true);

    const complete = resolveSetupState({ ...base, hasProperty: true, hasPets: true, hasPhoto: true });
    expect(complete.missingIds).toEqual([]);
    expect(complete.canContinue).toBe(true);
  });

  it("n'exige jamais les animaux : recommandés, absents des prérequis bloquants", () => {
    const s = resolveSetupState({ ...base, hasProperty: true, hasPhoto: true, hasPets: false });
    expect(s.canContinue).toBe(true);
    expect(s.missingIds).not.toContain("pets");
    expect(s.missingLabels.join(" ")).not.toMatch(/animal/i);
    expect(s.petsDone).toBe(false);
  });

  it("considère la photo faite quand elle vient du logement et non de la galerie", () => {
    const s = resolveSetupState({ ...base, hasProperty: true, hasPets: true, hasPhoto: true });
    expect(s.photoDone).toBe(true);
    expect(s.missingLabels).toEqual([]);
    expect(s.canContinue).toBe(true);
  });

  it("propose un retour au formulaire quand l'entrée est volontaire, même incomplète", () => {
    const s = resolveSetupState({ ...base, voluntary: true, hasProperty: true });
    expect(s.canGoBack).toBe(true);
    expect(s.canContinue).toBe(false);
    const afterBack = resolveSetupState({ ...base, voluntary: true, hasProperty: true, dismissed: true });
    expect(afterBack.showSetup).toBe(false);
  });

  it("garde l'écran fermé pendant le chargement et après le passage au formulaire", () => {
    expect(resolveSetupState({ ...base, loading: true }).showSetup).toBe(false);
    expect(resolveSetupState({ ...base, dismissed: true }).showSetup).toBe(false);
    expect(resolveSetupState({ ...base, entered: false }).showSetup).toBe(false);
  });

  it("n'ouvre pas l'écran d'entrée du préflight quand tout est déjà renseigné", () => {
    const s = resolveSetupState({
      ...base, entered: false, hasProperty: true, hasPets: true, hasPhoto: true,
    });
    expect(s.showSetup).toBe(false);
    expect(s.missing).toEqual([]);
  });
});
