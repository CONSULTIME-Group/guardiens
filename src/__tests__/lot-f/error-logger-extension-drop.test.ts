import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a), auth: { getSession: async () => ({ data: { session: null } }) } },
}));

import { reportError } from "@/lib/errorLogger";

const make = (message: string, stack: string) => {
  const e = new Error(message);
  e.stack = stack;
  return e;
};

describe("lot F3 : erreurs d'extensions de navigateur ignorées", () => {
  beforeEach(() => rpc.mockClear());

  it.each(["chrome-extension", "moz-extension", "safari-extension", "safari-web-extension"])(
    "rien n'est enregistré pour une pile %s://",
    async (scheme) => {
      reportError(make(`reading 'M_ID' ${scheme}`, `TypeError: x\n    at F (${scheme}://abc/executors/200.js:1:761)`));
      await new Promise((r) => setTimeout(r, 0));
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it("une erreur du site reste enregistrée", async () => {
    reportError(make("site error unique", `TypeError: y\n    at G (${window.location.origin}/assets/index-a.js:1:1)`));
    await new Promise((r) => setTimeout(r, 0));
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("un chunk périmé (message Firefox ou Safari) n'est pas enregistré", async () => {
    reportError(make("error loading dynamically imported module: https://guardiens.fr/assets/AppLayout-a.js", "x"));
    reportError(make("Importing a module script failed.", "y"));
    await new Promise((r) => setTimeout(r, 0));
    expect(rpc).not.toHaveBeenCalled();
  });
});
