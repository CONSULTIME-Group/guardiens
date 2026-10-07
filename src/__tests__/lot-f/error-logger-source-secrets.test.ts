import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a), auth: { getSession: async () => ({ data: { session: null } }) } },
}));

import { installGlobalErrorLogger } from "@/lib/errorLogger";

const fire = (message: string, filename: string, stack?: string) => {
  const error = new Error(message);
  if (stack) error.stack = stack;
  window.dispatchEvent(new ErrorEvent("error", { message, filename, lineno: 1, colno: 1, error }));
};

describe("lot F4 : source et pile sans jeton, portefeuilles ignorés", () => {
  beforeAll(() => installGlobalErrorLogger());
  beforeEach(() => rpc.mockClear());

  it("la source et la pile ne gardent aucun jeton de connexion", async () => {
    const page = "https://guardiens.fr/auth/confirm?next=%2Fsits%2Fcreate#access_token=eyJabc.def.ghi&refresh_token=y6i7&type=signup";
    fire("Erreur du site F4", page, `TypeError: z\n    at H (${page}:1:1)`);
    await new Promise((r) => setTimeout(r, 0));
    expect(rpc).toHaveBeenCalledTimes(1);
    const args = rpc.mock.calls[0][1] as Record<string, string>;
    expect(args._source).not.toContain("eyJabc");
    expect(args._source).not.toContain("y6i7");
    expect(args._stack).not.toContain("eyJabc");
    expect(args._stack).not.toContain("y6i7");
    expect(args._source).toContain("access_token=[redacted]");
  });

  it("l'erreur window.ethereum injectée par un portefeuille n'est pas enregistrée", async () => {
    fire("TypeError: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')", "https://guardiens.fr/recherche");
    await new Promise((r) => setTimeout(r, 0));
    expect(rpc).not.toHaveBeenCalled();
  });
});
