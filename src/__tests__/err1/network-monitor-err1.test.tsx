/**
 * Lot ERR1 : le moniteur réseau ignore la mesure d'audience de l'hébergeur,
 * n'alerte pas un onglet masqué et donne une empreinte stable aux dossiers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/errorLogger", () => ({ reportError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import NetworkErrorMonitor from "@/components/layout/NetworkErrorMonitor";
import { reportError } from "@/lib/errorLogger";
import { toast } from "sonner";
import { networkFingerprintKey } from "@/lib/networkFingerprint";

const flush = () => new Promise((r) => setTimeout(r, 20));
type W = { __networkMonitorInstalled?: boolean };

describe("NetworkErrorMonitor, lot ERR1", () => {
  const originalFetch = window.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as W).__networkMonitorInstalled = false;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    (window as unknown as W).__networkMonitorInstalled = false;
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  const install = (route: string, response: Response) => {
    window.fetch = vi.fn().mockResolvedValue(response);
    (window as unknown as W).__networkMonitorInstalled = false;
    render(
      <MemoryRouter initialEntries={[route]}>
        <NetworkErrorMonitor />
      </MemoryRouter>,
    );
  };

  it("ignore un 503 de la mesure d'audience de l'hébergeur (/__l5e/)", async () => {
    install("/petites-missions", new Response("", { status: 503 }));
    await window.fetch("/__l5e/trackevents", { method: "POST" });
    await flush();
    expect(reportError).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("enregistre sans alerter quand l'onglet est masqué", async () => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    install("/sits/create", new Response(JSON.stringify({ code: "IDLE_TIMEOUT" }), { status: 504 }));
    await window.fetch("https://x.supabase.co/functions/v1/moderate-content", { method: "POST" });
    await flush();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("transmet une empreinte stable (méthode, chemin, statut)", async () => {
    install("/sits/create", new Response("{}", { status: 500 }));
    await window.fetch("https://x.supabase.co/functions/v1/moderate-content?x=1", { method: "POST" });
    await flush();
    const call = vi.mocked(reportError).mock.calls[0];
    expect(call[2]).toEqual({ fingerprintKey: "network|POST|/functions/v1/moderate-content|500" });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});

describe("networkFingerprintKey", () => {
  it("retire paramètres et identifiants", () => {
    expect(networkFingerprintKey("GET", "https://x.supabase.co/rest/v1/sits/2f0e9b1c-1111-4a2b-8c3d-123456789abc?select=*", 400))
      .toBe("network|GET|/rest/v1/sits/:id|400");
    expect(networkFingerprintKey("POST", "/__l5e/trackevents", 503)).toBe("network|POST|/__l5e/trackevents|503");
  });
});
