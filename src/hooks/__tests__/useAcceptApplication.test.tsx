/**
 * « Via la plateforme » : l'acceptation passe par la RPC accept_application
 * (qui passe l'annonce en confirmed), sans UPDATE direct, sans unpublish_sit,
 * sans aucune annulation de candidature.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const calls: { rpc: any[]; updates: Array<{ table: string; values: any }> } = { rpc: [], updates: [] };

const chain = (table: string): any => {
  const result = { data: null, error: null };
  const c: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return (res: any) => Promise.resolve(result).then(res);
        if (prop === "update") return (values: any) => { calls.updates.push({ table, values }); return c; };
        return () => c;
      },
    },
  );
  return c;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async (name: string, args: any) => {
      calls.rpc.push({ name, args });
      return { data: { success: true, sit_id: "sit1", auto_rejected_count: 0, auto_rejected_sitter_ids: [] }, error: null };
    }),
    from: (t: string) => chain(t),
  },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner1" } }) }));
vi.mock("@/lib/sendTransactionalEmail", () => ({ sendTransactionalEmail: vi.fn(async () => ({})) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/errorLogger", () => ({ reportError: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/components/gardes/AccordDeGarde", () => ({ default: () => null }));

import { useAcceptApplication } from "@/hooks/useAcceptApplication";

describe("useAcceptApplication", () => {
  beforeEach(() => { calls.rpc = []; calls.updates = []; });

  it("accepte la candidature choisie via la RPC et ouvre l'accord, sans rien annuler", async () => {
    const onAccepted = vi.fn();
    const { result } = renderHook(() => useAcceptApplication({ onAccepted }));
    let ok = false;
    await act(async () => {
      ok = await result.current.acceptApplication({ applicationId: "app1", sitId: "sit1", sitterId: "s1", sitterFirstName: "Léa" });
    });
    expect(ok).toBe(true);
    expect(calls.rpc).toEqual([{ name: "accept_application", args: { p_application_id: "app1" } }]);
    expect(calls.rpc.some((c) => c.name === "unpublish_sit")).toBe(false);
    for (const u of calls.updates) {
      expect(u.table).not.toBe("applications");
      expect(u.values?.status).toBeUndefined();
    }
    expect(onAccepted).toHaveBeenCalledWith("sit1");
    expect(result.current.accordDialog).not.toBeNull();
  });
});
