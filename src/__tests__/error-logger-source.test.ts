import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Garde-fou du panneau "Erreurs utilisateurs" : reportError(error, { source })
 * doit transmettre la source logique au champ top-level du payload RPC
 * (colonne error_logs.source), sinon NetworkErrorsSection ne retrouve pas
 * les erreurs marquées par NetworkErrorMonitor.
 */

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: null, error: null })),
  getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
  isInAppBrowser: vi.fn(() => false),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  },
}));

vi.mock("@/lib/inAppBrowser", () => ({
  isInAppBrowser: mocks.isInAppBrowser,
}));

import { reportError, extractLogicalSource } from "@/lib/errorLogger";

const rpcPayload = (callIndex: number) => mocks.rpc.mock.calls[callIndex][1] as {
  _fingerprint: string;
  _message: string;
  _source: string | null;
  _context: Record<string, unknown> | null;
};

describe("extractLogicalSource", () => {
  it("extrait une source logique non vide", () => {
    expect(extractLogicalSource({ source: "NetworkErrorMonitor" })).toBe(
      "NetworkErrorMonitor",
    );
  });

  it("retourne null pour une source absente, vide ou non string", () => {
    expect(extractLogicalSource(undefined)).toBeNull();
    expect(extractLogicalSource({})).toBeNull();
    expect(extractLogicalSource({ source: "" })).toBeNull();
    expect(extractLogicalSource({ source: "   " })).toBeNull();
    expect(extractLogicalSource({ source: 42 })).toBeNull();
  });
});

describe("reportError transmet la source logique au RPC", () => {
  beforeEach(() => {
    mocks.rpc.mockClear();
    mocks.getUser.mockClear();
    mocks.isInAppBrowser.mockClear();
  });

  it("passe context.source en champ top-level _source et conserve le context", async () => {
    reportError(new Error("boom avec source"), {
      source: "NetworkErrorMonitor",
      statut: 500,
    });
    await vi.waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    });

    const payload = rpcPayload(0);
    expect(payload._source).toBe("NetworkErrorMonitor");
    expect(payload._context).toMatchObject({
      source: "NetworkErrorMonitor",
      statut: 500,
    });
    expect(typeof payload._fingerprint).toBe("string");
  });

  it("laisse _source à null sans context.source", async () => {
    reportError(new Error("boom sans source"), { statut: 418 });
    await vi.waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    });

    const payload = rpcPayload(0);
    expect(payload._source).toBeNull();
    expect(payload._context).toMatchObject({ statut: 418 });
  });

  it("ne change pas le fingerprint : deux erreurs de même message sont throttlées, avec ou sans source", async () => {
    const err = new Error("empreinte stable");
    reportError(err, { source: "NetworkErrorMonitor" });
    await vi.waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    });
    const fpAvecSource = rpcPayload(0)._fingerprint;

    // Même message sans source : si le fingerprint avait changé, le throttle
    // laisserait passer un second appel RPC. Il ne doit pas y en avoir.
    reportError(err);
    await new Promise((r) => setTimeout(r, 50));
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    // Le fingerprint reste bien celui calculé avec la source logique.
    expect(fpAvecSource).toEqual(rpcPayload(0)._fingerprint);
  });
});
