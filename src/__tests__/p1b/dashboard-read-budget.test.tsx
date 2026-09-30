/**
 * Lot P1b : budget de lectures du tableau de bord.
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
  const m = await import("./supabaseRecorder");
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

import { registerAppQueryClient } from "@/lib/appQueryClient";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";

export const TABLE_MAX = 2;
export const TOTAL_MAX = 40;

const recOf = () => h.rec as import("./supabaseRecorder").Recorder;
async function mountAndCount(role: "owner" | "sitter") {
  auth.role = role;
  const rec = recOf();
  rec.reset();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  registerAppQueryClient(qc);
  render(
    <>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </>,
  );
  // Laisse se résoudre les chargements différés et les lectures en cascade.
  for (let i = 0; i < 30; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  }
  const counts = rec.counts();
  const total = rec.reads.length;
  if (process.env.P1B_SITES) console.log(rec.sites.sort().join("\n"));
  cleanup();
  qc.clear();
  return { counts, total };
}

function report(label: string, r: { counts: Record<string, number>; total: number }) {
  const sorted = Object.entries(r.counts).sort((a, b) => b[1] - a[1]);
  // eslint-disable-next-line no-console
  console.log(`[P1b] ${label} total=${r.total}\n` + sorted.map(([k, v]) => `  ${k}: ${v}`).join("\n"));
}

describe("P1b, budget de lectures de /dashboard", () => {
  beforeEach(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });

  for (const role of ["owner", "sitter"] as const) {
    it(`${role} : au plus ${TABLE_MAX} lectures par table et ${TOTAL_MAX} au total`, async () => {
      const r = await mountAndCount(role);
      report(role, r);
      const over = Object.entries(r.counts).filter(([, v]) => v > TABLE_MAX);
      expect(over).toEqual([]);
      expect(r.total).toBeLessThanOrEqual(TOTAL_MAX);
    }, 30000);
  }
});
