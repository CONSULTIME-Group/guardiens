import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as labels from "@/lib/admin/labels";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/admin/AffinityOnboardingFunnelCard", () => ({ AffinityOnboardingFunnelCard: () => <p>carte affinite</p> }));
vi.mock("@/pages/admin/_components/alma/DiscoveryFunnelCard", () => ({ DiscoveryFunnelCard: () => <p>carte decouverte</p> }));
vi.mock("@/pages/admin/_components/alma/ConversationsTab", () => ({ ConversationsTab: () => <p>contenu conversations</p> }));
vi.mock("@/pages/admin/_components/alma/MoodsTab", () => ({ MoodsTab: () => <p>contenu humeurs</p> }));
vi.mock("@/pages/admin/_components/alma/PilotageTab", () => ({ PilotageTab: () => <button>Rejouer le jeu de test</button> }));
vi.mock("@/integrations/supabase/client", () => {
  const q: any = new Proxy({}, { get: (_t, k) => (k === "then" ? (r: any) => r({ data: [], error: null }) : () => q) });
  return { supabase: { rpc: async () => ({ data: null, error: null }), from: () => q, functions: { invoke: async () => ({}) } } };
});

import AdminAlma from "@/pages/admin/AdminAlma";

const renderAlma = (url = "/admin/alma") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path="/admin/alma" element={<AdminAlma />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const activate = (name: RegExp) => {
  const t = screen.getByRole("tab", { name });
  fireEvent.mouseDown(t, { button: 0, ctrlKey: false });
  fireEvent.click(t);
};

describe("A11, /admin/alma : un onglet monté à la fois", () => {
  it("seul le contenu de l'onglet actif est monté", () => {
    renderAlma();
    expect(screen.getByText("contenu conversations")).toBeTruthy();
    expect(screen.queryByText("contenu humeurs")).toBeNull();
    expect(screen.queryByText("Rejouer le jeu de test")).toBeNull();
    activate(/Humeurs/);
    expect(screen.getByText("contenu humeurs")).toBeTruthy();
    expect(screen.queryByText("contenu conversations")).toBeNull();
    activate(/Pilotage/);
    expect(screen.getByText("Rejouer le jeu de test")).toBeTruthy();
    expect(screen.queryByText("contenu humeurs")).toBeNull();
  });

  it("les six onglets sont accessibles au clavier", async () => {
    renderAlma("/admin/alma?tab=bubbles");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    for (let i = 0; i < tabs.length - 1; i++) {
      const current = screen.getAllByRole("tab")[i];
      act(() => current.focus());
      fireEvent.keyDown(current, { key: "ArrowRight" });
      await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
      expect(screen.getAllByRole("tab")[i + 1].getAttribute("data-state")).toBe("active");
    }
    expect(screen.getByText("Rejouer le jeu de test")).toBeTruthy();
  });

  it("les cartes lourdes sont repliées par défaut, titre cliquable", () => {
    renderAlma();
    expect(screen.queryByText("carte affinite")).toBeNull();
    expect(screen.queryByText("carte decouverte")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Entonnoir de découverte/ }));
    expect(screen.getByText("carte decouverte")).toBeTruthy();
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(f) ? [p] : [];
  });
}

describe("A11, aucune clé technique en dur dans un texte JSX de src/pages/admin", () => {
  const keys = new Set<string>();
  for (const v of Object.values(labels)) {
    if (v && typeof v === "object") for (const k of Object.keys(v)) if (/^[a-z]+(_[a-z]+)+$/.test(k)) keys.add(k);
  }

  it("le dictionnaire contient des clés snake_case à surveiller", () => {
    expect(keys.size).toBeGreaterThan(10);
  });

  it("aucune de ces clés n'apparaît entre deux balises", () => {
    const hits: string[] = [];
    for (const file of walk("src/pages/admin")) {
      const src = readFileSync(file, "utf8");
      // texte JSX : entre > et <, hors accolades
      for (const m of src.matchAll(/>([^<>{}]+)</g)) {
        for (const w of m[1].split(/[^a-z_]+/)) if (keys.has(w)) hits.push(`${file}: ${w}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
