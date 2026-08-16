import { describe, it, expect } from "vitest";
import { resolveSetupState } from "../setupState";
import {
  canPublishSit,
  getBlockingBlockers,
  getSitPublishBlockers,
  type SitPublishTwoFieldsInput,
} from "../sitPublishRules";

/**
 * Non-régression du 16/08/2026 : un propriétaire sans aucun animal était
 * enfermé dans l'écran de mise en route de /sits/create (le bouton Continuer
 * exigeait un animal et aucun retour n'était possible), alors que la décision
 * produit du 12/08/2026 rend les animaux recommandés et jamais bloquants.
 *
 * Ce test chaîne les deux sources de vérité exactement comme l'application :
 * l'écran de mise en route (setupState) puis la publication (sitPublishRules).
 * Il prouve que le parcours de création d'annonce est franchissable de bout
 * en bout par un propriétaire sans animal (maison, jardin, plantes à garder).
 */

const text = (n: number) => "a".repeat(n);

/** Dates toujours à venir, pour que la suite ne périme pas avec le temps. */
const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

/** Propriétaire avec identité, logement et photo, zéro animal. */
const ownerWithoutPets = {
  loading: false,
  hasProperty: true,
  hasPets: false,
  hasPhoto: true,
  hasIdentity: true,
  dismissed: false,
  voluntary: false,
};

describe("Parcours de création franchissable sans aucun animal", () => {
  it("le préflight n'ouvre pas l'écran de mise en route pour les seuls animaux manquants", () => {
    const s = resolveSetupState({ ...ownerWithoutPets, entered: false });
    expect(s.missing).toEqual([]);
    expect(s.missingIds).not.toContain("pets");
    expect(s.showSetup).toBe(false);
  });

  it("l'écran de mise en route se franchit sans animal renseigné", () => {
    const s = resolveSetupState({ ...ownerWithoutPets, entered: true });
    expect(s.showSetup).toBe(true);
    expect(s.canContinue).toBe(true);
  });

  it("la publication est autorisée sans animal, le rappel reste informatif", () => {
    const input: SitPublishTwoFieldsInput = {
      descriptionMode: "two-fields",
      title: "Maison et jardin à garder pendant nos vacances",
      startDate: iso(30),
      endDate: iso(40),
      flexibleDates: false,
      absenceReason: text(40),
      sitterExpectations: text(40),
      hasProperty: true,
      galleryPhotoCount: 1,
      petCount: 0,
    };
    const blockers = getSitPublishBlockers(input);
    expect(blockers.find((b) => b.id === "pets")?.advisory).toBe(true);
    expect(getBlockingBlockers(blockers)).toEqual([]);
    expect(canPublishSit(input)).toBe(true);
  });
});
