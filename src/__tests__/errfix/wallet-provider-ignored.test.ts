import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a), auth: { getSession: async () => ({ data: { session: null } }) } },
}));

import { installGlobalErrorLogger } from "@/lib/errorLogger";

const reject = (reason: unknown) => {
  const event = new Event("unhandledrejection") as Event & { reason: unknown; promise: Promise<unknown> };
  Object.assign(event, { reason, promise: Promise.resolve() });
  window.dispatchEvent(event);
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("errfix 25/10 : rejet EIP-1193 d'un portefeuille du visiteur ignoré", () => {
  beforeAll(() => installGlobalErrorLogger());
  beforeEach(() => rpc.mockClear());

  it("« disconnected from all chains » (code 4901) n'est pas enregistré", async () => {
    reject({ code: 4901, message: "The provider is disconnected from all chains." });
    await tick();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("« disconnected from the specified chain » non plus", async () => {
    reject(new Error("The provider is disconnected from the specified chain."));
    await tick();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("un rejet du site reste enregistré", async () => {
    reject(new Error("Erreur du site errfix"));
    await tick();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
