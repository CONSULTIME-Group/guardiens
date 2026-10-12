/**
 * Lot F2 (12/10/2026) : chargements robustes.
 *
 * 1. Un import résolu à vide (Vite après vite:preloadError + preventDefault)
 *    ne fait plus planter React : 14 erreurs « _result.default » du 05 au
 *    12/10 sur /inscription, /login, /go, fiches gardien et associations.
 * 2. Un WebSocket refusé ne fait plus tomber une page : 5 plantages de fiches
 *    gardien publiques les 11 et 12/10.
 */
import { describe, it, expect, vi } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { optionalLazy, isUsableModule } from "@/lib/optionalLazy";
import { guardRealtimeConnect } from "@/lib/realtimeGuard";
import { isStaleChunkError } from "@/lib/staleChunk";

describe("F2, import résolu à vide", () => {
  it("reconnaît un module inutilisable", () => {
    expect(isUsableModule(undefined)).toBe(false);
    expect(isUsableModule({})).toBe(false);
    expect(isUsableModule({ default: () => null })).toBe(true);
  });

  it("un composant accessoire résolu à vide rend rien, sans planter", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const Extra = optionalLazy(load as never, 1);
    render(
      <div data-testid="page">
        <Suspense fallback={null}>
          <Extra />
        </Suspense>
        contenu
      </div>,
    );
    expect(await screen.findByText("contenu")).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("un composant accessoire qui arrive à la seconde tentative s'affiche", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ default: () => <span>extra</span> });
    const Extra = optionalLazy(load as never, 1);
    render(
      <Suspense fallback={null}>
        <Extra />
      </Suspense>,
    );
    expect(await screen.findByText("extra")).toBeTruthy();
  });

  it("la signature React d'un import vide est traitée comme un fichier périmé", () => {
    expect(isStaleChunkError(new Error("undefined is not an object (evaluating 'e._result.default')"))).toBe(true);
    expect(isStaleChunkError(new Error("Cannot read properties of undefined (reading 'default')"))).toBe(true);
    expect(isStaleChunkError(new Error("Cannot read properties of undefined (reading 'map')"))).toBe(false);
  });

  it("plus aucun React.lazy nu dans les fichiers corrigés", () => {
    for (const f of [
      "src/components/analytics/AfterPaintExtrasLazy.ts",
      "src/components/analytics/DeferredTrackers.tsx",
      "src/components/search/SearchSitter.tsx",
      "src/components/search/SearchOwner.tsx",
      "src/components/guides/GuideMapLazy.tsx",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/(^|[^A-Za-z])lazy\(/m);
    }
  });
});

describe("F2, temps réel sans WebSocket", () => {
  it("une connexion impossible ne lève plus d'erreur", () => {
    const client = {
      realtime: {
        connect: () => {
          throw new Error("WebSocket not available: Failed to construct 'WebSocket'");
        },
      },
    };
    expect(guardRealtimeConnect(client)).toBe(true);
    expect(() => (client.realtime as { connect: () => void }).connect()).not.toThrow();
  });

  it("garde unique, connexion normale inchangée", () => {
    const connect = vi.fn().mockReturnValue("ok");
    const client = { realtime: { connect } };
    expect(guardRealtimeConnect(client)).toBe(true);
    expect(guardRealtimeConnect(client)).toBe(false);
    expect((client.realtime as { connect: () => string }).connect()).toBe("ok");
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("sans client temps réel, rien ne se passe", () => {
    expect(guardRealtimeConnect(undefined)).toBe(false);
    expect(guardRealtimeConnect({})).toBe(false);
  });

  it("câblage au démarrage et dans useHeroWeights", () => {
    expect(readFileSync("src/main.tsx", "utf8")).toContain("guardRealtimeConnect(supabase)");
    const hero = readFileSync("src/hooks/useHeroWeights.ts", "utf8");
    expect(hero).toMatch(/try \{[\s\S]*\.subscribe\(\);[\s\S]*\} catch/);
  });
});
