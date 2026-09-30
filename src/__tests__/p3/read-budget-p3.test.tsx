/**
 * Lot P3 : budgets resserrés du tableau de bord et de l'accueil membre.
 * Monte la coquille membre + /dashboard avec un client Supabase simulé et
 * compte les lectures par table. Échec si une table dépasse 2 lectures ou
 * si le total dépasse 40, pour un propriétaire et pour un gardien.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const h = vi.hoisted(() => ({ role: "owner" as "owner" | "sitter", rec: null as any }));
const auth = h;
const USER_ID = "00000000-0000-4000-8000-000000000001";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../p1b/supabaseRecorder");
  h.rec = m.createRecorder();
  return { supabase: m.createSupabaseMock(h.rec, "00000000-0000-4000-8000-000000000001") };
});
vi.mock("@/contexts/AuthContext", () => {
  const user = {
    id: "00000000-0000-4000-8000-000000000001", email: "test@example.com", role: "both", firstName: "Jérémie", lastName: "M",
    profileCompletion: 90, identityVerified: true, isFounder: true,
    onboardingCompleted: true, onboardingMinimalCompleted: true, onboardingDismissedAt: null,
  };
  return {
    useAuth: () => ({
      user, activeRole: auth.role, isAuthenticated: true, loading: false, hasSession: true,
      authChecked: true, profileError: false, authTimeout: false,
      switchRole: () => {}, setActiveRole: () => {}, login: async () => {}, register: async () => {},
      logout: () => {}, refreshProfile: async () => {},
    }),
    AuthProvider: ({ children }: any) => children,
    detectPersistedToken: () => true,
  };
});

import { fixtures } from "../p1b/supabaseRecorder";
import { registerAppQueryClient } from "@/lib/appQueryClient";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import GlobalBottomNav from "@/components/layout/GlobalBottomNav";

const TABLE_MAX = 2;
/**
 * Valeurs mesurées après P3 (propriétaire 39, gardien 37, comptes neufs 28/30).
 * Lot P4 : propriétaire 40 sur ce simulateur (qui ignore les filtres) : la
 * lecture des avis du Top 3 attend désormais le classement au lieu de se
 * fondre par hasard avec les autres ; sur le vivier réaliste (p4/), 49 → 43.
 */
const P3_TOTAL: Record<string, number> = { "owner-true": 40, "sitter-true": 37, "owner-false": 28, "sitter-false": 30 };
const HOME_MAX = 10;

const recOf = () => h.rec as import("../p1b/supabaseRecorder").Recorder;
const U = "00000000-0000-4000-8000-000000000001";
const future = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const now = new Date().toISOString();
/** Vivier réaliste : cartes, candidatures et annonces déclenchent les lectures en cascade. */
const POPULATED: Record<string, any[]> = {
  profiles: [{ id: U, first_name: "Jérémie", role: "both", latitude: 45.76, longitude: 4.83, postal_code: "69001", city: "Lyon", profile_completion: 90, created_at: now }],
  public_profiles: ["s1", "s2", "s3", "s4", "s5"].map((id, i) => ({
    id, first_name: `Membre ${i}`, role: "sitter", city: "Lyon", postal_code: "69002",
    latitude_approx: 45.7 + i / 100, longitude_approx: 4.8, identity_verified: i % 2 === 0,
    profile_completion: 80, completed_sits_count: i, skill_categories: ["garden"], custom_skills: [],
  })),
  sitter_profiles_affinity: ["s1", "s2", "s3", "s4", "s5"].map((user_id) => ({ user_id, animal_types: ["Chiens"], competences: [] })),
  public_sitter_profiles: ["s1", "s2", "s3"].map((user_id) => ({ user_id, competences: [] })),
  sitter_profiles: [{ user_id: U, animal_types: ["Chiens", "Chats"], languages: ["Français"], interests: [] }],
  owner_profiles: [{ user_id: U }],
  sits: ["t1", "t2", "t3"].map((id, i) => ({
    id, user_id: i === 0 ? U : `o${i}`, title: `Garde ${i}`, city: "Lyon", status: "published",
    start_date: future(10 + i), end_date: future(20 + i), created_at: now, updated_at: now,
    accepting_applications: true, property_id: "p1", applications: [{ id: "a1", status: "pending", sitter_id: "s1" }],
  })),
  applications: [
    { id: "a1", sit_id: "t1", sitter_id: "s1", status: "pending", created_at: now, sit: { id: "t1", title: "Garde 0", start_date: future(10), end_date: future(20), status: "published", user_id: U } },
    { id: "a2", sit_id: "t1", sitter_id: "s2", status: "pending", created_at: now, sit: { id: "t1", title: "Garde 0", start_date: future(10), end_date: future(20), status: "published", user_id: U } },
  ],
  properties: [{ id: "p1", user_id: U, type: "house", environment: "city_center", photos: [], car_required: false, created_at: now }],
  pets: [{ id: "pet1", property_id: "p1", species: "dog", name: "Rex", breed: null, special_needs: null }],
  reviews: [{ id: "r1", overall_rating: 5, reviewee_id: U, reviewer_id: "s1", published: true, created_at: now }],
  small_missions: [{ id: "m1", user_id: "o1", title: "Arrosage", category: "garden", city: "Lyon", status: "open", created_at: now, updated_at: now }],
  conversations: [{ id: "c1", owner_id: U, sitter_id: "s1", small_mission_id: null, updated_at: now, messages: [] }],
};

async function mountAndCount(role: "owner" | "sitter", populated = true, path = "/dashboard") {
  for (const k of Object.keys(fixtures)) delete fixtures[k];
  if (populated) Object.assign(fixtures, POPULATED);
  auth.role = role;
  const rec = recOf();
  rec.reset();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  registerAppQueryClient(qc);
  render(
    <>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Routes>
          {path === "/" && <GlobalBottomNav />}
        </MemoryRouter>
      </QueryClientProvider>
    </>,
  );
  // Laisse se résoudre les chargements différés et les lectures en cascade.
  // 5,2 s : au-delà des montages différés (temps libre, 2,5 s au plus), tout le tableau de bord est compté.
  for (let i = 0; i < 260; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  }
  const counts = rec.counts();
  const total = rec.reads.length;
  cleanup();
  qc.clear();
  return { counts, total };
}

describe("P3, budget de lectures", () => {
  beforeEach(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });

  for (const [role, populated] of [["owner", true], ["sitter", true], ["owner", false], ["sitter", false]] as const) {
    it(`/dashboard ${role}${populated ? " avec données" : " compte neuf"} : aucune table plus de 2 fois, total P3`, async () => {
      const r = await mountAndCount(role, populated);
      expect(Object.entries(r.counts).filter(([, v]) => v > TABLE_MAX)).toEqual([]);
      expect(r.total).toBeLessThanOrEqual(P3_TOTAL[`${role}-${populated}`]);
    }, 30000);
  }

  it("/ membre connecté sur ordinateur : au plus 10 lectures, aucune du tableau de bord ni d'Alma", async () => {
    const mm = window.matchMedia;
    (globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
    (globalThis as any).IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
    (window as any).matchMedia = (q: string) => ({ matches: /min-width/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false });
    try {
      const r = await mountAndCount("owner", true, "/");
      // eslint-disable-next-line no-console
      console.log("[P3] / membre", r.total, JSON.stringify(r.counts));
      expect(r.total).toBeLessThanOrEqual(HOME_MAX);
      expect(Object.entries(r.counts).filter(([, v]) => v > TABLE_MAX)).toEqual([]);
      for (const t of ["applications", "small_missions", "properties", "pets", "reviews", "sitter_profiles", "owner_profiles", "badge_attributions", "fn:ma-periode", "fn:alma-weather"]) {
        expect(r.counts[t] ?? 0, t).toBe(0);
      }
    } finally {
      (window as any).matchMedia = mm;
    }
  }, 30000);
});
