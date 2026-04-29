/**
 * Vérifie le hook useOwnerDashboardData :
 *   1. Reset immédiat (anti-flicker) puis chargement complet → données peuplées.
 *   2. Calcul des onboardingChecks (hasName, hasAvatar, hasBio, hasIdentity, hasProperty, hasPets, hasSit).
 *   3. Comptage des "trusted sitters" (>= 2 gardes acceptées terminées).
 *   4. Erreur réseau → state d'erreur exposé, loading retombe à false.
 *
 * Le mock Supabase route par nom de table. Chaque table renvoie un dataset
 * configurable via `tableData`. La chaîne (.select/.eq/.in/.order/.limit/.single)
 * est inerte mais "thénable" pour résoudre la dernière promesse.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

type TableResult = { data: any; error: any };
let tableData: Record<string, TableResult> = {};
let throwOnTable: string | null = null;

vi.mock("@/integrations/supabase/client", () => {
  const buildChain = (table: string): any => {
    const result = (): TableResult => {
      if (throwOnTable === table) throw new Error("network down");
      return tableData[table] ?? { data: [], error: null };
    };
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      single: async () => result(),
      maybeSingle: async () => result(),
      then: (cb: any, errCb?: any) =>
        Promise.resolve(result()).then(cb, errCb),
    };
    return chain;
  };

  return {
    supabase: {
      from: (table: string) => buildChain(table),
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";

describe("useOwnerDashboardData", () => {
  beforeEach(() => {
    tableData = {};
    throwOnTable = null;
  });

  it("démarre en loading puis expose les données chargées", async () => {
    tableData = {
      sits: {
        data: [
          {
            id: "sit-1",
            user_id: "owner-1",
            status: "published",
            title: "Garde 1",
            start_date: null,
            end_date: null,
            created_at: new Date().toISOString(),
            property_id: "prop-1",
            cancelled_by: null,
            applications: [],
          },
        ],
        error: null,
      },
      properties: {
        data: [{ id: "prop-1", type: "house", environment: "city", photos: ["/p.jpg"] }],
        error: null,
      },
      reviews: { data: [{ overall_rating: 5 }], error: null },
      profiles: {
        data: {
          first_name: "Alice",
          avatar_url: "/a.jpg",
          bio: "Une bio suffisamment longue pour valider hasBio",
          identity_verification_status: "verified",
          onboarding_completed: true,
          onboarding_dismissed_at: null,
          onboarding_minimal_completed: true,
        },
        error: null,
      },
      owner_highlights: { data: [], error: null },
      small_missions: { data: [], error: null },
      pets: { data: [{ id: "pet-1", name: "Rex", species: "dog", property_id: "prop-1" }], error: null },
      applications: { data: [], error: null },
    };

    const { result } = renderHook(() => useOwnerDashboardData("owner-1"));

    expect(result.current.loading).toBe(true);
    expect(result.current.data.sits).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data.sits).toHaveLength(1);
    expect(result.current.data.pets).toHaveLength(1);
    expect(result.current.data.reviews).toHaveLength(1);
    expect(result.current.data.propertyType).toBe("house");
    expect(result.current.data.propertyCoverPhoto).toBe("/p.jpg");
    expect(result.current.data.verificationStatus).toBe("verified");
    expect(result.current.data.profile?.onboarding_minimal_completed).toBe(true);
  });

  it("calcule correctement les onboardingChecks", async () => {
    tableData = {
      sits: { data: [], error: null },
      properties: { data: [], error: null },
      reviews: { data: [], error: null },
      profiles: {
        data: {
          first_name: null,
          avatar_url: null,
          bio: "trop court",
          identity_verification_status: "not_submitted",
          onboarding_minimal_completed: false,
        },
        error: null,
      },
      owner_highlights: { data: [], error: null },
      small_missions: { data: [], error: null },
    };

    const { result } = renderHook(() => useOwnerDashboardData("owner-2"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const c = result.current.data.onboardingChecks;
    expect(c.hasName).toBe(false);
    expect(c.hasAvatar).toBe(false);
    expect(c.hasBio).toBe(false); // bio < 10 chars
    expect(c.hasIdentity).toBe(false);
    expect(c.hasProperty).toBe(false);
    expect(c.hasPets).toBe(false);
    expect(c.hasSit).toBe(false);
  });

  it("compte les gardiens de confiance (>= 2 gardes acceptées terminées)", async () => {
    tableData = {
      sits: {
        data: [
          {
            id: "s1", user_id: "o", status: "completed", title: "", created_at: "",
            property_id: "p", start_date: null, end_date: null, cancelled_by: null,
            applications: [{ id: "a1", status: "accepted", sitter_id: "sitter-A" }],
          },
          {
            id: "s2", user_id: "o", status: "completed", title: "", created_at: "",
            property_id: "p", start_date: null, end_date: null, cancelled_by: null,
            applications: [{ id: "a2", status: "accepted", sitter_id: "sitter-A" }],
          },
          {
            id: "s3", user_id: "o", status: "completed", title: "", created_at: "",
            property_id: "p", start_date: null, end_date: null, cancelled_by: null,
            applications: [{ id: "a3", status: "accepted", sitter_id: "sitter-B" }],
          },
        ],
        error: null,
      },
      properties: { data: [], error: null },
      reviews: { data: [], error: null },
      profiles: { data: { first_name: "X" }, error: null },
      owner_highlights: { data: [], error: null },
      small_missions: { data: [], error: null },
      applications: { data: [], error: null },
    };

    const { result } = renderHook(() => useOwnerDashboardData("o"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // sitter-A : 2 gardes → trusted ; sitter-B : 1 garde → non
    expect(result.current.data.trustedSitterCount).toBe(1);
  });

  it("gère une erreur réseau sans crasher (loading=false, error rempli)", async () => {
    throwOnTable = "sits";

    const { result } = renderHook(() => useOwnerDashboardData("owner-err"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data.sits).toEqual([]);
  });
});
