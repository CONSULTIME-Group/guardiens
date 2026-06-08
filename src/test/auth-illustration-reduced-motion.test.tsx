import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { AuthIllustrationPanel } from "@/components/auth/AuthIllustrationPanel";

/**
 * Garantit que `prefers-reduced-motion: reduce` désactive entièrement la vidéo
 * sur /login et /inscription, tout en gardant l'image fixe visible avec une
 * apparence strictement identique (object-contain, object-bottom, masque droit).
 */

function mockMatchMedia(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduce : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("AuthIllustrationPanel — prefers-reduced-motion", () => {
  beforeEach(() => {
    cleanup();
  });

  it("ne monte AUCUNE balise <video> quand reduced-motion est demandé", () => {
    mockMatchMedia(true);
    const { container } = render(
      <AuthIllustrationPanel title="Bienvenue" description="Test" />
    );
    expect(container.querySelectorAll("video").length).toBe(0);
  });

  it("garde l'image fixe visible (poster identique) en reduced-motion", () => {
    mockMatchMedia(true);
    const { container } = render(
      <AuthIllustrationPanel title="Bienvenue" description="Test" />
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    // Apparence identique au mode animé : object-contain + object-bottom.
    expect(img!.className).toContain("object-contain");
    expect(img!.className).toContain("object-bottom");
  });

  it("monte une <video> unique (lecture unique + freeze) hors reduced-motion", () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    const { container } = render(
      <AuthIllustrationPanel title="Bienvenue" description="Test" />
    );
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // v3 : <video> unique (loop=false + freeze sur dernière frame).
    // Le crossfade A/B a été supprimé pour économiser CPU/batterie.
    expect(container.querySelectorAll("video").length).toBe(1);
    vi.useRealTimers();
  });
});
