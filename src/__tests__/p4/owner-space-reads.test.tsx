/**
 * Lot P4 : espace propriétaire sans doublons.
 *
 * Monte /dashboard propriétaire sur un vivier réaliste (1 326 gardiens,
 * réponses plafonnées à 1 000 lignes, filtres appliqués) et vérifie :
 *  - aucune table lue plus de 2 fois, sitter_profiles_affinity en une seule
 *    salve partagée par tous les blocs ;
 *  - parité : mêmes gardiens, même ordre, mêmes scores qu'avant P4
 *    (instantané figé sur le code d'avant, owner-space-parity.snap.json).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const h = vi.hoisted(() => ({ rec: null as any }));
const U = "00000000-0000-4000-8000-000000000001";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("./supabaseRealistic");
  h.rec = m.createRealRecorder();
  return { supabase: m.createRealSupabaseMock(h.rec, "00000000-0000-4000-8000-000000000001") };
});
vi.mock("@/contexts/AuthContext", () => {
  const user = {
    id: "00000000-0000-4000-8000-000000000001", email: "test@example.com", role: "both", firstName: "Jérémie", lastName: "M",
    profileCompletion: 90, identityVerified: true, isFounder: true,
    onboardingCompleted: true, onboardingMinimalCompleted: true, onboardingDismissedAt: null,
  };
  return {
    useAuth: () => ({
      user, activeRole: "owner", isAuthenticated: true, loading: false, hasSession: true,
      authChecked: true, profileError: false, authTimeout: false,
      switchRole: () => {}, setActiveRole: () => {}, login: async () => {}, register: async () => {},
      logout: () => {}, refreshProfile: async () => {},
    }),
    AuthProvider: ({ children }: any) => children,
    detectPersistedToken: () => true,
  };
});

import { realFixtures, buildRealisticOwnerFixtures, type RealRecorder } from "./supabaseRealistic";
import { registerAppQueryClient } from "@/lib/appQueryClient";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";

async function mountOwner() {
  for (const k of Object.keys(realFixtures)) delete realFixtures[k];
  Object.assign(realFixtures, buildRealisticOwnerFixtures(U));
  const rec = h.rec as RealRecorder;
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
  for (let i = 0; i < 300; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  }
  const top = qc.getQueryData<any>(["owner-top-affinity-sitters", U]);
  const nearby = qc.getQueryData<any>(["nearby-owner-sitters", U]);
  const result = {
    counts: rec.counts(), inSizes: JSON.stringify(rec.inSizes),
    total: rec.reads.length,
    top: {
      totalPool: top?.totalPool,
      scoredCount: top?.scoredCount,
      sitters: (top?.topSitters ?? []).map((s: any) => ({
        id: s.id, score: s.affinity.score, sortScore: s.affinity.sortScore, confidence: s.affinity.confidence,
        distance: Math.round((s.distance_km ?? -1) * 1000) / 1000,
      })),
    },
    nearby: {
      totalCount: nearby?.totalCount,
      radiusUsed: nearby?.radiusUsed,
      sitters: (nearby?.sitters ?? []).map((s: any) => ({
        id: s.id, avg_rating: s.avg_rating, custom_skills: s.custom_skills,
        affinity_input: s.affinity_input ? Object.keys(s.affinity_input).sort().map((k) => [k, s.affinity_input[k]]) : null,
      })),
    },
  };
  cleanup();
  qc.clear();
  return result;
}

describe("P4, espace propriétaire sans doublons (vivier réaliste)", () => {
  beforeEach(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* silencieux */ } });

  it("lectures bornées et parité des classements", async () => {
    const r = await mountOwner();
    // eslint-disable-next-line no-console
    console.log("[P4] propriétaire réaliste", r.total, JSON.stringify(r.counts), r.inSizes);
    expect(r.top.sitters.length).toBe(3);
    expect(r.nearby.sitters.length).toBeGreaterThan(0);
    await expect(JSON.stringify({ top: r.top, nearby: r.nearby }, null, 1)).toMatchFileSnapshot("./owner-space-parity.snap.json");
    if (process.env.P4_BASELINE) return;
    // public_profiles : le vivier de 1 326 gardiens se lit en 2 pages
    // (plafond serveur de 1 000 lignes), plus le compteur « coup de main »
    // (autre population, tous rôles). Les pages d'une même lecture ne sont
    // pas des doublons : elles sont retirées du décompte.
    const poolPages = Math.ceil(1326 / 1000);
    const deduped = { ...r.counts, public_profiles: (r.counts.public_profiles ?? 0) - (poolPages - 1) };
    expect(Object.entries(deduped).filter(([, v]) => v > 2)).toEqual([]);
    expect(r.counts.reviews).toBeLessThanOrEqual(2);
    // Une seule salve : 600 identifiants scorés, deux requêtes au plus (limite de longueur d'URL).
    expect(r.counts.sitter_profiles_affinity).toBeLessThanOrEqual(2);
  }, 60000);
});
