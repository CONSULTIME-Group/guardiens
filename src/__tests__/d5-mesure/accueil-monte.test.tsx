/**
 * Lot D5 (09/11/2026) : /dashboard monté en entier (harnais des lots L4 et D4).
 * Les blocs de mesure enveloppent l'accueil sur ordinateur comme sur
 * téléphone, aucun conteneur vide ne reste visible, et le budget de 40
 * lectures est inchangé (la mesure écrit, elle ne lit pas).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const h = vi.hoisted(() => ({ rec: null as any, role: "both" as "owner" | "both", active: "owner" as "owner" | "sitter" }));
const U = "00000000-0000-4000-8000-000000000001";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../p1b/supabaseRecorder");
  h.rec = m.createRecorder();
  return { supabase: m.createSupabaseMock(h.rec, "00000000-0000-4000-8000-000000000001") };
});
vi.mock("@/contexts/AuthContext", () => {
  // Objets stables d'un rendu à l'autre, comme le vrai contexte.
  const users = {
    owner: { id: "00000000-0000-4000-8000-000000000001", email: "t@example.com", role: "owner", firstName: "Jérémie", lastName: "M",
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
      user: users[h.role], activeRole: h.active, isAuthenticated: true, loading: false, hasSession: true,
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
const PHOTOS = ["https://x.supabase.co/storage/v1/object/public/a/1.jpg", "https://x.supabase.co/storage/v1/object/public/a/2.jpg", "https://x.supabase.co/storage/v1/object/public/a/3.jpg"];

function populate(photos: string[]) {
  for (const k of Object.keys(fixtures)) delete fixtures[k];
  Object.assign(fixtures, {
    profiles: [{ id: U, first_name: "Jérémie", role: "both", latitude: 45.76, longitude: 4.83, postal_code: "69001", city: "Lyon", profile_completion: 90, created_at: now }],
    public_profiles: ["s1", "s2"].map((id, i) => ({ id, first_name: i ? "Hugo" : "Léa", role: "sitter", city: "Lyon", latitude_approx: 45.7, longitude_approx: 4.8, profile_completion: 80 })),
    sitter_profiles: [{ user_id: U, animal_types: ["Chiens"] }],
    owner_profiles: [{ user_id: U }],
    sits: [{
      id: "t1", user_id: U, title: "Garde", city: "Lyon", status: "published", start_date: future(10), end_date: future(20),
      created_at: now, updated_at: now, accepting_applications: true, property_id: "p1",
      applications: [{ id: "a1", status: "pending", sitter_id: "s1" }],
    }],
    applications: [{ id: "a1", sit_id: "t1", sitter_id: "s1", status: "pending", created_at: now, sit: { id: "t1", title: "Garde", start_date: future(10), end_date: future(20), status: "published", user_id: U } }],
    properties: [{ id: "p1", user_id: U, type: "house", environment: "city_center", photos, created_at: now }],
    pets: [{ id: "pet1", property_id: "p1", species: "dog", name: "Rex" }],
    owner_gallery_insights: photos.map((u) => ({ photo_url: u, shows_home: false })),
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




const blocks = () => [...document.querySelectorAll<HTMLElement>("[data-dashboard-block]")];
const names = () => new Set(blocks().map((b) => b.dataset.dashboardBlock));
function noVisibleEmpty() {
  for (const b of blocks()) {
    if (b.hidden) continue;
    expect(b.childElementCount, b.dataset.dashboardBlock).toBeGreaterThan(0);
  }
}

describe("D5, blocs mesurés sur l'accueil monté", () => {
  beforeEach(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    (globalThis as any).IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
  });
  afterEach(() => { cleanup(); setDesktop(false); h.active = "owner"; });

  it("propriétaire sur ordinateur : accueil, vedette et colonne de droite, 40 lectures au plus", async () => {
    setDesktop(true);
    h.role = "owner";
    populate([]);
    const { rec } = await mount(2500);
    const n = names();
    for (const b of ["cockpit", "star", "alma", "reassurance"]) expect(n.has(b), b).toBe(true);
    noVisibleEmpty();
    expect(rec.reads.length).toBeLessThanOrEqual(40);
  }, 30000);

  it("propriétaire sur téléphone : le récit est un bloc, la colonne de droite aussi", async () => {
    setDesktop(false);
    h.role = "owner";
    populate(PHOTOS);
    const { rec } = await mount();
    const n = names();
    expect(n.has("story")).toBe(true);
    expect(n.has("cockpit")).toBe(false);
    expect(document.querySelector("[data-dashboard-block='story'] [data-testid='owner-story-home']")).not.toBeNull();
    noVisibleEmpty();
    expect(rec.reads.length).toBeLessThanOrEqual(40);
  }, 30000);

  it("gardien sur ordinateur : accueil et gardes mesurés", async () => {
    setDesktop(true);
    h.role = "both";
    h.active = "sitter";
    populate([]);
    const { rec } = await mount(2500);
    const n = names();
    for (const b of ["cockpit", "match", "alma"]) expect(n.has(b), b).toBe(true);
    noVisibleEmpty();
    expect(rec.reads.length).toBeLessThanOrEqual(40);
  }, 30000);
});
