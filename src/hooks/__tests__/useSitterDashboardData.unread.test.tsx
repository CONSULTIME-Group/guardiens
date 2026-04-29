/**
 * Vérifie le compteur de messages non lus exposé par useSitterDashboardData :
 *   1. État de chargement initial puis succès (`unreadCount` = valeur RPC).
 *   2. Erreur RPC → `unreadError` est rempli, `unreadCount` retombe à 0,
 *      `unreadLoading` = false (le dashboard ne crashe pas).
 *   3. `refetchUnread()` rejoue la RPC et efface l'erreur précédente.
 *
 * Le mock Supabase ne couvre que ce dont ce test a besoin :
 * `from(...)` chainable inerte + `rpc("get_unread_messages_count")` contrôlé
 * + `channel(...).on().subscribe()` no-op (pas de realtime en jsdom).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// État partagé contrôlé par chaque test
let rpcResponse: { data: number | null; error: { message: string } | null } = {
  data: 0,
  error: null,
};
const rpcCalls: Array<{ name: string; args: any }> = [];

vi.mock("@/integrations/supabase/client", () => {
  // Chain inerte qui résout toujours { data: [], error: null }
  const inertResolver = async () => ({ data: [], error: null });
  const buildChain = (): any => ({
    select: () => buildChain(),
    eq: () => buildChain(),
    neq: () => buildChain(),
    in: () => buildChain(),
    order: () => buildChain(),
    limit: () => buildChain(),
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (cb: any, errCb?: any) => inertResolver().then(cb, errCb),
  });

  return {
    supabase: {
      from: () => buildChain(),
      rpc: (name: string, args: any) => {
        rpcCalls.push({ name, args });
        if (name === "get_unread_messages_count") {
          return Promise.resolve(rpcResponse);
        }
        return Promise.resolve({ data: null, error: null });
      },
      channel: () => ({
        on: function () { return this; },
        subscribe: function () { return this; },
      }),
      removeChannel: () => {},
    },
  };
});

// Import APRÈS le mock
import { useSitterDashboardData } from "@/hooks/useSitterDashboardData";

describe("useSitterDashboardData — unread messages branch", () => {
  beforeEach(() => {
    rpcCalls.length = 0;
    rpcResponse = { data: 0, error: null };
  });

  it("démarre en chargement puis expose le compteur en cas de succès", async () => {
    rpcResponse = { data: 7, error: null };

    const { result } = renderHook(() => useSitterDashboardData("user-1"));

    // État initial
    expect(result.current.unreadLoading).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.unreadError).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.unreadLoading).toBe(false);
    expect(result.current.unreadCount).toBe(7);
    expect(result.current.unreadError).toBeNull();
    expect(rpcCalls.some((c) => c.name === "get_unread_messages_count")).toBe(true);
  });

  it("expose un message d'erreur quand la RPC échoue, sans crasher", async () => {
    rpcResponse = { data: null, error: { message: "boom" } };

    const { result } = renderHook(() => useSitterDashboardData("user-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.unreadLoading).toBe(false);
    expect(result.current.unreadError).toMatch(/messages non lus/i);
  });

  it("refetchUnread() rejoue la RPC et efface l'erreur précédente", async () => {
    // 1er appel : erreur
    rpcResponse = { data: null, error: { message: "boom" } };
    const { result } = renderHook(() => useSitterDashboardData("user-1"));
    await waitFor(() => expect(result.current.unreadError).not.toBeNull());

    // 2e appel : succès
    rpcResponse = { data: 3, error: null };
    await act(async () => {
      await result.current.refetchUnread();
    });

    expect(result.current.unreadCount).toBe(3);
    expect(result.current.unreadError).toBeNull();
    expect(result.current.unreadLoading).toBe(false);
  });
});
