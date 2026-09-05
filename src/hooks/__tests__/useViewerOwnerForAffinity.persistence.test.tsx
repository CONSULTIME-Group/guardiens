/**
 * Test 2 — Persistance du badge d'affinité au re-render.
 *
 * `useViewerOwnerForAffinity` alimente le badge. Son effet dépend de l'objet
 * `user` d'AuthContext : si cet objet change d'identité référentielle sans
 * changer de valeur (re-render du provider), l'effet se rejoue. Le profil
 * chargé ne doit à aucun moment repasser à null, sinon le badge disparaît.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

let currentUser: any = { id: "owner-1" };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: currentUser }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (resolver: () => Promise<any>): any => ({
    select: () => chain(resolver),
    eq: () => chain(resolver),
    maybeSingle: resolver,
    then: (cb: any, err?: any) => resolver().then(cb, err),
  });
  return {
    supabase: {
      from: (table: string) =>
        table === "owner_profiles"
          ? chain(async () => ({
              data: { user_id: "owner-1", languages: ["Français"], life_pace: "calme" },
              error: null,
            }))
          : chain(async () => ({
              data: [{ pets: [{ species: "dog", special_needs: null }] }],
              error: null,
            })),
    },
  };
});

import { useViewerOwnerForAffinity, clearViewerOwnerCache } from "@/hooks/useViewerOwnerForAffinity";

describe("useViewerOwnerForAffinity, stabilité au re-render", () => {
  beforeEach(() => {
    clearViewerOwnerCache();
    currentUser = { id: "owner-1" };
  });

  it("conserve le profil owner quand l'objet user change d'identité sans changer de valeur", async () => {
    const { result, rerender } = renderHook(() => useViewerOwnerForAffinity());

    await waitFor(() => expect(result.current.owner).not.toBeNull());
    const first = result.current.owner;

    const seen: any[] = [];
    for (let i = 0; i < 5; i++) {
      currentUser = { id: "owner-1" }; // nouvelle référence, même valeur
      rerender();
      seen.push(result.current.owner);
      await Promise.resolve();
    }

    expect(seen.every((o) => o !== null), "le profil owner est repassé à null pendant un re-render").toBe(true);
    await waitFor(() => expect(result.current.owner).not.toBeNull());
    expect(result.current.owner).toEqual(first);
  });

  it("ne déclenche pas d'état de chargement effaçant le badge déjà calculé", async () => {
    const { result, rerender } = renderHook(() => useViewerOwnerForAffinity());
    await waitFor(() => expect(result.current.loading).toBe(false));

    currentUser = { id: "owner-1" };
    rerender();

    // Le badge est rendu à partir de `owner` : il doit rester disponible même
    // si `loading` repasse à true le temps de re-résoudre le cache.
    expect(result.current.owner).not.toBeNull();
  });
});
