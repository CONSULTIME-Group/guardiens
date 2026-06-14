/**
 * Vérifie la règle de priorité du cockpit gardien, en particulier
 * la nouvelle étape « compétences » insérée après le code postal :
 * si le profil est complet, géolocalisé, mais aucune compétence n'est
 * déclarée, on pousse à compléter cette étape pour débloquer le feed
 * d'entraide. Sans ce verrou, l'utilisateur ne sait pas pourquoi il
 * n'apparaît pas dans le feed mutual aid.
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSitterPriorityAction } from "@/hooks/useSitterPriorityAction";

const baseInput = {
  nextGuard: null,
  profileCompletion: 80,
  postalCode: "69001",
  nearbyListings: [],
  isAvailable: true,
};

describe("useSitterPriorityAction — règle de priorité", () => {
  it("pousse à ajouter une compétence quand le profil est OK mais competencesCount = 0", () => {
    const { result } = renderHook(() =>
      useSitterPriorityAction({ ...baseInput, competencesCount: 0 }),
    );
    expect(result.current.variant).toBe("skills");
    expect(result.current.ctaTo).toContain("section=competences");
  });

  it("ne pousse plus la carte compétences dès qu'au moins une est déclarée", () => {
    const { result } = renderHook(() =>
      useSitterPriorityAction({ ...baseInput, competencesCount: 1 }),
    );
    expect(result.current.variant).not.toBe("skills");
  });

  it("garde la priorité au profil incomplet (< 60%) avant la carte compétences", () => {
    const { result } = renderHook(() =>
      useSitterPriorityAction({
        ...baseInput,
        profileCompletion: 30,
        competencesCount: 0,
      }),
    );
    expect(result.current.variant).toBe("profile");
  });

  it("garde la priorité au code postal manquant avant la carte compétences", () => {
    const { result } = renderHook(() =>
      useSitterPriorityAction({
        ...baseInput,
        postalCode: null,
        competencesCount: 0,
      }),
    );
    expect(result.current.variant).toBe("postal");
  });
});
