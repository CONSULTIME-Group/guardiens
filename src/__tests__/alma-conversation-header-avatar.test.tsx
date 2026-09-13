/**
 * Lot X quater : l'en tête du panneau de conversation ne rend JAMAIS deux
 * avatars, y compris quand la largeur change. Le test porte sur le DOM rendu
 * (avatar réel, pas de doublure), pas sur le source.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { resetAlmaConversation } from "@/lib/alma/conversation-store";

vi.mock("@/hooks/useAlmaVoiceInput", () => ({
  useAlmaVoiceInput: () => ({ supported: false, status: "idle", toggle: vi.fn(), error: null }),
}));
vi.mock("@/components/ai/alma/AlmaDock", () => ({
  VoiceStatusLine: () => null,
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

import { AlmaConversation } from "@/components/ai/alma/AlmaConversation";

function setViewportWidth(width: number) {
  window.matchMedia = ((query: string) => {
    const min = query.match(/min-width:\s*(\d+)px/);
    const max = query.match(/max-width:\s*(\d+)px/);
    const matches = min
      ? width >= Number(min[1])
      : max
        ? width <= Number(max[1])
        : false;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

function renderPanel() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AlmaConversation
        open
        onOpenChange={() => {}}
        surface="dashboard"
        activeRole="owner"
        initialMessage="Bonjour, je suis là."
        stage="nouvelle"
      />
    </MemoryRouter>,
  );
}

describe("en tête du panneau Alma", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    cleanup();
    resetAlmaConversation();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("ne rend qu'un seul avatar en largeur desktop", () => {
    setViewportWidth(1707);
    renderPanel();
    const header = screen.getByTestId("alma-dock-panel").querySelector("header");
    expect(header).not.toBeNull();
    expect(header!.querySelectorAll("svg").length).toBe(1);
  });

  it("ne rend qu'un seul avatar en largeur mobile", () => {
    setViewportWidth(390);
    renderPanel();
    const header = screen.getByTestId("alma-dock-panel").querySelector("header");
    expect(header).not.toBeNull();
    expect(header!.querySelectorAll("svg").length).toBe(1);
  });
});
