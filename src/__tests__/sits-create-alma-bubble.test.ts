/**
 * Vérifie la logique d'affichage de la bulle Alma sur /sits/create.
 * Test pur : miroir des conditions du composant CreateSit (Chantier 3).
 */
import { describe, it, expect } from "vitest";

interface Ctx {
  almaBubbleDismissed?: boolean;
  draftIdParam?: string | null;
  fromSitId?: string | null;
  republishMode?: "copy" | "adapt" | null;
  hasUserEdited?: boolean;
  isFormEmpty?: boolean;
  currentStep?: number;
}

function shouldShowBubble(c: Ctx): boolean {
  return !c.almaBubbleDismissed
    && !c.draftIdParam
    && !c.fromSitId
    && !c.republishMode
    && !c.hasUserEdited
    && !!c.isFormEmpty
    && (c.currentStep ?? 0) === 0;
}

describe("CreateSit AlmaBubble visibility", () => {
  const base: Ctx = { isFormEmpty: true, currentStep: 0 };

  it("s'affiche sur formulaire vierge, step 0, aucun paramètre d'édition", () => {
    expect(shouldShowBubble(base)).toBe(true);
  });

  it("masquée quand un draftId est fourni (reprise de brouillon)", () => {
    expect(shouldShowBubble({ ...base, draftIdParam: "abc" })).toBe(false);
  });

  it("masquée en mode republish (from/mode)", () => {
    expect(shouldShowBubble({ ...base, fromSitId: "s1", republishMode: "copy" })).toBe(false);
  });

  it("masquée dès que l'utilisateur a commencé à saisir", () => {
    expect(shouldShowBubble({ ...base, hasUserEdited: true })).toBe(false);
    expect(shouldShowBubble({ ...base, isFormEmpty: false })).toBe(false);
  });

  it("masquée si dismiss sessionStorage", () => {
    expect(shouldShowBubble({ ...base, almaBubbleDismissed: true })).toBe(false);
  });

  it("masquée hors step 0", () => {
    expect(shouldShowBubble({ ...base, currentStep: 2 })).toBe(false);
  });
});
