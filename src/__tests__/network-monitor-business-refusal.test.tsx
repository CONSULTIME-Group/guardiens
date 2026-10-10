/**
 * NetworkErrorMonitor : un refus métier volontaire de la base (RAISE
 * EXCEPTION, code P0001) renvoyé en 400 par PostgREST ne doit déclencher
 * ni toast technique ni log admin, que l'appel vise une fonction RPC ou
 * une écriture directe de table (trigger, ex: doublon de titre sur
 * small_missions). Le message métier est déjà affiché par l'appelant.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/errorLogger", () => ({
  reportError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import NetworkErrorMonitor from "@/components/layout/NetworkErrorMonitor";
import { reportError } from "@/lib/errorLogger";
import { toast } from "sonner";

const PG_REFUSAL_BODY = JSON.stringify({
  code: "P0001",
  details: null,
  hint: "duplicate_small_mission",
  message: "Vous avez déjà une annonce en ligne avec ce titre.",
});

const flush = () => new Promise((r) => setTimeout(r, 20));

describe("NetworkErrorMonitor, refus métier P0001", () => {
  const originalFetch = window.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { __networkMonitorInstalled?: boolean }).__networkMonitorInstalled = false;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    (window as unknown as { __networkMonitorInstalled?: boolean }).__networkMonitorInstalled = false;
  });

  const mount = (route: string) =>
    render(
      <MemoryRouter initialEntries={[route]}>
        <NetworkErrorMonitor />
      </MemoryRouter>,
    );

  it("ignore un 400 P0001 sur écriture directe de table (trigger)", async () => {
    mount("/petites-missions/creer");
    window.fetch = vi.fn().mockResolvedValue(
      new Response(PG_REFUSAL_BODY, { status: 400 }),
    );
    // Réinstalle le moniteur pour qu'il patche le fetch simulé
    (window as unknown as { __networkMonitorInstalled?: boolean }).__networkMonitorInstalled = false;
    mount("/petites-missions/creer");

    await window.fetch(
      "https://example.supabase.co/rest/v1/small_missions?select=id%2Cslug",
      { method: "POST" },
    );
    await flush();

    expect(reportError).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("ignore un 400 P0001 sur fonction RPC", async () => {
    mount("/petites-missions/creer");
    window.fetch = vi.fn().mockResolvedValue(
      new Response(PG_REFUSAL_BODY, { status: 400 }),
    );
    (window as unknown as { __networkMonitorInstalled?: boolean }).__networkMonitorInstalled = false;
    mount("/petites-missions/creer");

    await window.fetch(
      "https://example.supabase.co/rest/v1/rpc/create_alert",
      { method: "POST" },
    );
    await flush();

    expect(reportError).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("signale toujours un 400 technique (sans code P0001)", async () => {
    mount("/petites-missions/creer");
    window.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "23502", message: "null value" }), { status: 400 }),
    );
    (window as unknown as { __networkMonitorInstalled?: boolean }).__networkMonitorInstalled = false;
    mount("/petites-missions/creer");

    await window.fetch(
      "https://example.supabase.co/rest/v1/small_missions?select=id%2Cslug",
      { method: "POST" },
    );
    await flush();

    expect(reportError).toHaveBeenCalledTimes(1);
  });
});
