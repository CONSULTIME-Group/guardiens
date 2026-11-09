/**
 * Lot L7 : /dashboard gardien monté en entier (coquille membre, client
 * Supabase simulé du lot P1b). Téléphone : le récit remplace cockpit et
 * vedette, un seul bouton plein, aucun bouton collant, la garde mise en
 * avant n'est pas répétée dans la liste ; ordinateur : accueil inchangé ;
 * budget : 40 lectures au plus, 2 par table.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const h = vi.hoisted(() => ({ rec: null as any, role: "sitter" as "sitter" | "both" }));
const U = "00000000-0000-4000-8000-000000000001";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../p1b/supabaseRecorder");
  h.rec = m.createRecorder();
  return { supabase: m.createSupabaseMock(h.rec, "00000000-0000-4000-8000-000000000001") };
});
vi.mock("@/contexts/AuthContext", () => {
  // Objets stables d'un rendu à l'autre, comme le vrai contexte.
  const users = {
    sitter: { id: "00000000-0000-4000-8000-000000000001", email: "t@example.com", role: "sitter", firstName: "Jérémie", lastName: "M",
      profileCompletion: 90, identityVerified: true, isFounder: true,
      onboardingCompleted: true, onboardingMinimalCompleted: true, onboardingDismissedAt: null },
    both: { id: "00000000-0000-4000-8000-000000000001", email: "t@example.com", role: "both", firstName: "Jérémie", lastName: "M",
      profileCompletion: 90, identityVerified: true, isFounder: true,
      onboardingCompleted: true, onboardingMinimalCompleted: true, onboardingDismissedAt: null },
  };
  const fns = {
    switchRole: () => {}, setActiveRole: () => {}, login: async () => {}, register: async () => {},
    logout: () => {}, refreshProfile: async () => {},
  };
  return {
    useAuth: () => ({
      user: users[h.role], activeRole: "sitter", isAuthenticated: true, loading: false, hasSession: true,
      authChecked: true, profileError: false, authTimeout: false, ...fns,
    }),
    AuthProvider: ({ children }: any) => children,
    detectPersistedToken: () => true,
  };
});

import { fixtures } from "../p1b/supabaseRecorder";
import { registerAppQueryClient } from "@/lib/appQueryClient";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";

const future = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const now = new Date().toISOString();

function populate() {
  for (const k of Object.keys(fixtures)) delete fixtures[k];
  Object.assign(fixtures, {
    profiles: [{ id: U, first_name: "Léa", role: "sitter", latitude: 45.76, longitude: 4.83, postal_code: "69001", city: "Lyon", profile_completion: 90, avatar_url: "a.jpg", bio: "x".repeat(60), identity_verified: true, created_at: now }],
    public_profiles: [
      { id: "o1", first_name: "Laurence", role: "owner", city: "Écully", latitude_approx: 45.77, longitude_approx: 4.77, profile_completion: 80 },
      { id: "o2", first_name: "Hélène", role: "owner", city: "Tassin", latitude_approx: 45.76, longitude_approx: 4.76, profile_completion: 80 },
    ],
    sitter_profiles: [{ user_id: U, animal_types: ["Chiens", "Chats"], languages: ["Français"], interests: ["jardin"], experience_years: 3, is_available: true }],
    sits: [
      { id: "t1", user_id: "o1", title: "Pompon à Écully", city: "ECULLY", status: "published", start_date: future(30), end_date: future(40), created_at: now, accepting_applications: true, property_id: "p1" },
      { id: "t2", user_id: "o2", title: "Biscuit à Tassin", city: "Tassin", status: "published", start_date: future(50), end_date: future(60), created_at: now, accepting_applications: true, property_id: "p2" },
    ],
    applications: [],
    public_pets: [
      { property_id: "p1", species: "dog", name: "Pompon" },
      { property_id: "p2", species: "cat", name: "Biscuit" },
    ],
  });
}

function setDesktop(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && /min-width:\s*1024px/.test(query),
    media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

async function mount(waitMs = 5200) {
  const rec = h.rec as import("../p1b/supabaseRecorder").Recorder;
  rec.reset();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  registerAppQueryClient(qc);
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  for (let i = 0; i < waitMs / 20; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  }
  return { rec, qc };
}

describe("L7, accueil gardien monté", () => {
  beforeEach(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  afterEach(() => { cleanup(); setDesktop(false); });

  it("téléphone : récit en tête, un seul bouton plein, recherche France entière, aucun cockpit ni bouton collant", async () => {
    setDesktop(false);
    h.role = "sitter";
    populate();
    const { rec } = await mount();
    const home = screen.getByTestId("sitter-story-home");
    const hero = screen.getByTestId("story-hero");
    expect(hero.getAttribute("data-chapter")).toBe("opening");
    const cta = screen.getByTestId("story-cta");
    expect(cta.getAttribute("href")).toMatch(/^\/sits\/t[12]$/);
    expect(screen.getByTestId("story-secondary").getAttribute("href")).toBe("/search?zone=france");
    expect(screen.getByTestId("story-entraide-line")).toBeTruthy();
    expect(screen.queryByTestId("sitter-cockpit")).toBeNull();
    expect(screen.queryByTestId("story-role-switch")).toBeNull();
    // Un seul bouton plein dans le premier bloc.
    const filled = Array.from(home.querySelectorAll("a, button")).filter((el) => /(^|\s)bg-primary(\s|$)/.test(el.className));
    expect(filled.length).toBe(1);
    // La garde du récit n'est pas répétée dans la liste.
    const featured = cta.getAttribute("href")!;
    const rows = screen.queryByTestId("sitter-sit-rows");
    if (rows) expect(Array.from(rows.querySelectorAll("a")).some((a) => a.getAttribute("href") === featured)).toBe(false);
    const counts = rec.counts();
    expect(Object.entries(counts).filter(([, v]) => v > 2)).toEqual([]);
    expect(rec.reads.length).toBeLessThanOrEqual(40);
    expect(rec.reads.includes("rpc:get_activity_since_last_visit")).toBe(false);
  }, 30000);

  it("double rôle : le choix d'espace au-dessus du récit", async () => {
    setDesktop(false);
    h.role = "both";
    populate();
    await mount(2500);
    expect(screen.getByTestId("story-role-switch")).toBeTruthy();
    expect(screen.getByTestId("story-hero")).toBeTruthy();
  }, 30000);

  it("ordinateur : accueil d'avant, sans récit", async () => {
    setDesktop(true);
    h.role = "sitter";
    populate();
    await mount(1500);
    expect(screen.getByTestId("sitter-cockpit")).toBeTruthy();
    expect(screen.queryByTestId("story-hero")).toBeNull();
  }, 30000);
});
