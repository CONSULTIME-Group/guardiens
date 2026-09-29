import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/admin/AffinityOnboardingFunnelCard", () => ({ AffinityOnboardingFunnelCard: () => null }));
vi.mock("@/pages/admin/_components/alma/DiscoveryFunnelCard", () => ({ DiscoveryFunnelCard: () => null }));
vi.mock("@/pages/admin/_components/alma/ConversationsTab", () => ({ ConversationsTab: () => <p>contenu conversations</p> }));
vi.mock("@/pages/admin/_components/alma/MoodsTab", () => ({ MoodsTab: () => <p>contenu humeurs</p> }));
vi.mock("@/pages/admin/_components/alma/PilotageTab", () => ({ PilotageTab: () => <button>Rejouer le jeu de test</button> }));
vi.mock("@/integrations/supabase/client", () => {
  const q: any = new Proxy({}, { get: (_t, k) => (k === "then" ? (r: any) => r({ data: [], error: null }) : () => q) });
  return { supabase: { rpc: async () => ({ data: null, error: null }), from: () => q, functions: { invoke: async () => ({}) } } };
});

import AdminAlma from "@/pages/admin/AdminAlma";

const Loc = () => <span data-testid="loc">{useLocation().search}</span>;

function renderAt(url: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path="/admin/alma" element={<><AdminAlma /><Loc /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const activate = (name: RegExp) => {
  const t = screen.getByRole("tab", { name });
  fireEvent.mouseDown(t, { button: 0, ctrlKey: false });
  fireEvent.click(t);
};

describe("J3, onglets de /admin/alma", () => {
  it("chaque onglet s'affiche au clic", () => {
    renderAt("/admin/alma");
    expect(screen.getByText("contenu conversations")).toBeTruthy();
    activate(/Pilotage/);
    expect(screen.getByTestId("loc").textContent).toBe("?tab=pilotage");
    expect(screen.getByText("Rejouer le jeu de test")).toBeTruthy();
    activate(/Humeurs/);
    expect(screen.getByText("contenu humeurs")).toBeTruthy();
    activate(/Conversations/);
    expect(screen.getByText("contenu conversations")).toBeTruthy();
  });
  it("les flèches du clavier changent d'onglet", async () => {
    renderAt("/admin/alma?tab=moods");
    const moods = screen.getByRole("tab", { name: /Humeurs/ });
    act(() => moods.focus());
    fireEvent.keyDown(moods, { key: "ArrowRight" });
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(screen.getByTestId("loc").textContent).toBe("?tab=pilotage");
    expect(screen.getByText("Rejouer le jeu de test")).toBeTruthy();
  });
});
