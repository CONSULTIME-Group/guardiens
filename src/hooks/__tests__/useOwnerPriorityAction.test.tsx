/**
 * Verrouille la règle de priorité du dashboard propriétaire, en particulier
 * le nouveau cran « animaux manquants » inséré entre identité et publication.
 * Sans animaux déclarés, l'annonce reste abstraite et les candidatures
 * arrivent mal qualifiées, d'où la promotion en urgence haute.
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOwnerPriorityAction } from "@/hooks/useOwnerPriorityAction";

const baseInput = {
  sits: [],
  pendingAppCount: 0,
  pendingReviews: [],
  verificationStatus: "verified" as string | null,
};

describe("useOwnerPriorityAction — règle de priorité", () => {
  it("pousse à ajouter des animaux quand petsCount = 0", () => {
    const { result } = renderHook(() =>
      useOwnerPriorityAction({ ...baseInput, petsCount: 0 }),
    );
    expect(result.current.variant).toBe("pets");
    expect(result.current.ctaTo).toContain("section=animals");
  });

  it("retombe sur publier la 1re annonce si des animaux existent mais aucun sit", () => {
    const { result } = renderHook(() =>
      useOwnerPriorityAction({ ...baseInput, petsCount: 1 }),
    );
    expect(result.current.variant).toBe("publish");
  });

  it("garde la priorité aux candidatures à examiner avant le cran animaux", () => {
    const { result } = renderHook(() =>
      useOwnerPriorityAction({ ...baseInput, pendingAppCount: 2, petsCount: 0 }),
    );
    expect(result.current.variant).toBe("applications");
  });
});
