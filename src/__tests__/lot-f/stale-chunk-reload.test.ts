import { describe, it, expect, beforeEach, vi } from "vitest";
import { isStaleChunkError, reloadOnceForStaleChunk } from "@/lib/staleChunk";

describe("lot F1 : chunk d'une version remplacée", () => {
  const reload = vi.fn();
  beforeEach(() => {
    sessionStorage.clear();
    reload.mockReset();
    Object.defineProperty(window, "location", { value: { ...window.location, reload }, writable: true });
  });

  it.each([
    "error loading dynamically imported module: https://guardiens.fr/assets/AppLayout-abc.js",
    "Failed to fetch dynamically imported module: https://guardiens.fr/assets/MessageBell-x.js",
    "Importing a module script failed.",
    "Loading chunk 12 failed.",
  ])("reconnaît « %s »", (message) => {
    expect(isStaleChunkError(new Error(message))).toBe(true);
  });

  it("ne reconnaît pas une erreur ordinaire", () => {
    expect(isStaleChunkError(new Error("Cannot read properties of undefined (reading 'map')"))).toBe(false);
  });

  it("recharge une seule fois en 60 secondes", () => {
    expect(reloadOnceForStaleChunk()).toBe(true);
    expect(reloadOnceForStaleChunk()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("recharge à nouveau après 60 secondes", () => {
    sessionStorage.setItem("stale-chunk-reload-at", String(Date.now() - 61_000));
    expect(reloadOnceForStaleChunk()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
